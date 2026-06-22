export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { ConversionError, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';

const TIMEOUT_MS = 90_000;

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const { buf, fields } = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 1, fileSize: 50 * 1024 * 1024 } });
      let buf = null; const fields = {};
      bb.on('file', (_, s) => { const c = []; s.on('data', d => c.push(d)); s.on('end', () => { buf = Buffer.concat(c); }); });
      bb.on('field', (n, v) => { fields[n] = v; });
      bb.on('finish', () => { if (!buf) return reject(new ConversionError(400, 'No PDF uploaded.')); resolve({ buf, fields }); });
      bb.on('error', reject);
      const ab = await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });

    const password = fields.password?.trim();
    if (!password) throw new ConversionError(400, 'A password is required to protect the PDF.');

    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new ConversionError(422, 'Not a valid PDF file.');
    }

    const secret = process.env.CONVERTAPI_SECRET;
    if (!secret) {
      throw new ConversionError(500, 'ConvertAPI is not configured. Set CONVERTAPI_SECRET in .env.local to use PDF encryption.');
    }

    // Use multipart upload with correct ConvertAPI v2 parameter names
    const form = new FormData();
    form.append('File', new Blob([buf], { type: 'application/pdf' }), 'input.pdf');
    form.append('UserPassword', password);
    form.append('OwnerPassword', password);
    form.append('PrintingPermissions', 'AllowPrinting');
    form.append('ChangingPermissions', 'NotAllowed');

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res;
    try {
      res = await fetch(
        `https://v2.convertapi.com/convert/pdf/to/protect?Secret=${secret}&StoreFile=true`,
        { method: 'POST', body: form, signal: controller.signal }
      );
    } catch (err) {
      if (err?.name === 'AbortError') throw new ConversionError(504, 'Protect request timed out.');
      throw new ConversionError(502, `ConvertAPI request failed: ${err.message}`);
    } finally { clearTimeout(tid); }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ConversionError(502, `ConvertAPI protect failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const url = json?.Files?.[0]?.Url;
    if (!url) throw new ConversionError(502, 'ConvertAPI did not return a file URL.');

    const fileRes = await fetch(url);
    if (!fileRes.ok || !fileRes.body) throw new ConversionError(502, 'Failed to download protected PDF.');

    const chunks = [];
    const reader = fileRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    const result = Buffer.concat(chunks);

    return buildFileResponse(result, 'application/pdf', 'protected.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'protect');
  }
}
