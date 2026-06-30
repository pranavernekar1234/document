export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

import Busboy from 'busboy';
import { comparePDFs } from '../../../../lib/pdf-compare.js';
import { buildErrorResponse, buildFileResponse, ConversionError } from '../../../../lib/stream-helpers.js';

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const files = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 2, fileSize: 50 * 1024 * 1024 } });
      const collected = [];
      let resolved = false;

      bb.on('file', (_, stream, info) => {
        const chunks = [];
        stream.on('data', (d) => chunks.push(d));
        stream.on('end', () => collected.push({ buffer: Buffer.concat(chunks), filename: info.filename ?? 'file.pdf' }));
        stream.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });
      });
      bb.on('finish', () => { if (!resolved) { resolved = true; resolve(collected); } });
      bb.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });

      const ab = await request.arrayBuffer();
      bb.write(Buffer.from(ab));
      bb.end();
    });

    if (files.length < 2) {
      throw new ConversionError(400, 'Please upload two PDF files to compare.');
    }
    const [a, b] = files;

    for (const f of [a, b]) {
      if (f.buffer.slice(0, 4).toString('ascii') !== '%PDF') {
        throw new ConversionError(422, `"${f.filename}" is not a valid PDF file.`);
      }
    }

    const report = await comparePDFs(a.buffer, b.buffer, { nameA: a.filename, nameB: b.filename });
    return buildFileResponse(report, 'application/pdf', 'compare-pdf.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'compare-pdf');
  }
}
