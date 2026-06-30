export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { mergePDFs } from '../../../../lib/pdf-processor.js';
import { buildErrorResponse, buildFileResponse, ConversionError } from '../../../../lib/stream-helpers.js';

export async function POST(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ success: false, error: 'Expected multipart/form-data' }, { status: 400 });
  }

  try {
    const pdfBuffers = await new Promise(async (resolve, reject) => {
      const busboy = Busboy({ headers: { 'content-type': contentType }, limits: { files: 20, fileSize: 50 * 1024 * 1024 } });
      const files = [];
      let resolved = false;

      busboy.on('file', (name, stream, info) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => files.push({ buffer: Buffer.concat(chunks), filename: info.filename ?? 'file.pdf' }));
        stream.on('error', err => { if (!resolved) { resolved = true; reject(err); } });
      });
      busboy.on('finish', () => { if (!resolved) { resolved = true; resolve(files.map(f => f.buffer)); } });
      busboy.on('error', err => { if (!resolved) { resolved = true; reject(err); } });

      const ab = await request.arrayBuffer();
      busboy.write(Buffer.from(ab));
      busboy.end();
    });

    if (pdfBuffers.length === 0) throw new ConversionError(400, 'No PDF files received.');
    const merged = await mergePDFs(pdfBuffers);
    return buildFileResponse(merged, 'application/pdf', 'merged.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'merge');
  }
}
