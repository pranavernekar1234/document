export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import Busboy from 'busboy';
import { repairPDF } from '../../../../lib/pdf-processor.js';
import { buildErrorResponse, buildFileResponse, ConversionError } from '../../../../lib/stream-helpers.js';

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const buf = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 1, fileSize: 50 * 1024 * 1024 } });
      let buf = null;
      bb.on('file', (_, s) => { const c = []; s.on('data', d => c.push(d)); s.on('end', () => { buf = Buffer.concat(c); }); });
      bb.on('finish', () => { if (!buf) return reject(new ConversionError(400, 'No PDF uploaded.')); resolve(buf); });
      bb.on('error', reject);
      const ab = await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });

    const { buffer: result, recoveredPages, originalPages } = await repairPDF(buf);

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="repaired.pdf"',
      'Content-Length': String(result.length),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Recovered-Pages': String(recoveredPages),
      ...(originalPages != null ? { 'X-Original-Pages': String(originalPages) } : {}),
    });
    return new Response(result, { status: 200, headers });
  } catch (err) {
    return buildErrorResponse(err, 'repair-pdf');
  }
}
