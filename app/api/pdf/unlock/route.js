export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { ConversionError, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';

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

    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new ConversionError(422, 'Not a valid PDF file.');
    }

    const password = fields.password?.trim() ?? '';
    const { PDFDocument, EncryptedPDFError } = await import('pdf-lib');

    // pdf-lib has no PDF-decryption support at all — it cannot accept a
    // password and decrypt content streams. Loading WITHOUT
    // `ignoreEncryption` is therefore used purely as a detection probe: it
    // throws EncryptedPDFError if (and only if) the file actually has an
    // /Encrypt dictionary. If it loads cleanly, the PDF was never really
    // protected, so we just re-save and hand it back.
    try {
      const doc = await PDFDocument.load(buf);
      const bytes = await doc.save();
      return buildFileResponse(Buffer.from(bytes), 'application/pdf', 'unlocked.pdf');
    } catch (err) {
      const isEncrypted = err instanceof EncryptedPDFError || /encrypt/i.test(err?.message ?? '');
      if (!isEncrypted) {
        throw new ConversionError(422, 'Unable to read this PDF. It may be corrupted — try the Repair PDF tool first.');
      }
      // Genuinely encrypted: do NOT fall back to `ignoreEncryption: true` and
      // re-save here. pdf-lib would load the document but never decrypt its
      // content streams, silently producing a file that still won't open
      // correctly — appearing to "succeed" while actually staying broken.
      // Real decryption requires an external engine, handled below.
    }

    const secret = process.env.CONVERTAPI_SECRET;
    if (!secret) {
      throw new ConversionError(
        500,
        'This PDF has strong encryption that requires ConvertAPI. Set CONVERTAPI_SECRET in .env.local, or try a PDF without a password.'
      );
    }

    const form = new FormData();
    form.append('File', new Blob([buf], { type: 'application/pdf' }), 'input.pdf');
    if (password) form.append('Password', password);

    const res = await fetch(
      `https://v2.convertapi.com/convert/pdf/to/unprotect?Secret=${secret}&StoreFile=true`,
      { method: 'POST', body: form }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 400 && /password/i.test(body)) {
        throw new ConversionError(400, 'Incorrect password. Please check the password and try again.');
      }
      throw new ConversionError(502, `Unlock failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const url = json?.Files?.[0]?.Url;
    if (!url) throw new ConversionError(502, 'No output file returned.');

    const fileRes = await fetch(url);
    const result = Buffer.from(await fileRes.arrayBuffer());
    return buildFileResponse(result, 'application/pdf', 'unlocked.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'unlock');
  }
}
