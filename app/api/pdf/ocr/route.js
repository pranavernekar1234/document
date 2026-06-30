export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180; // OCR is the slowest tool in this app

import Busboy from 'busboy';
import { ocrPDF } from '../../../../lib/pdf-ocr.js';
import { buildErrorResponse, ConversionError } from '../../../../lib/stream-helpers.js';

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const buf = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 1, fileSize: 30 * 1024 * 1024 } });
      let buf = null;
      bb.on('file', (_, s) => { const c = []; s.on('data', d => c.push(d)); s.on('end', () => { buf = Buffer.concat(c); }); });
      bb.on('finish', () => { if (!buf) return reject(new ConversionError(400, 'No PDF uploaded.')); resolve(buf); });
      bb.on('error', reject);
      const ab = await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });

    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new ConversionError(422, 'Not a valid PDF file.');
    }

    const { buffer: result, alreadySearchable, pageCount, ocrPages } = await ocrPDF(buf);

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="ocr.pdf"',
      'Content-Length': String(result.length),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Already-Searchable': String(alreadySearchable),
      'X-Page-Count': String(pageCount),
      'X-OCR-Pages': String(ocrPages),
    });
    return new Response(result, { status: 200, headers });
  } catch (err) {
    return buildErrorResponse(err, 'ocr-pdf');
  }
}
