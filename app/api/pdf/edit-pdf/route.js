export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

import Busboy from 'busboy';
import { PDFDocument, rgb } from 'pdf-lib';
import { ConversionError, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';

/**
 * Accepts the original PDF plus a JSON array of annotation operations
 * (one entry per page edited) and bakes them into the PDF using pdf-lib.
 *
 * Annotation shape:
 *   { page: number (0-indexed), type: 'highlight'|'redact'|'text',
 *     x, y, width, height, text?, color? }
 * Coordinates are in PDF point space (already converted client-side
 * from the canvas render scale).
 */
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

    let annotations = [];
    try { annotations = JSON.parse(fields.annotations || '[]'); }
    catch { throw new ConversionError(400, 'Invalid annotations payload.'); }

    if (!Array.isArray(annotations) || annotations.length === 0) {
      throw new ConversionError(400, 'No annotations to apply. Add at least one highlight, redaction, or text box.');
    }

    let doc;
    try { doc = await PDFDocument.load(buf); }
    catch { throw new ConversionError(422, 'Unable to load PDF. It may be encrypted.'); }

    const pages = doc.getPages();
    const font = await doc.embedFont('Helvetica');

    for (const ann of annotations) {
      const pageIdx = Math.max(0, Math.min(pages.length - 1, ann.page ?? 0));
      const page = pages[pageIdx];
      const { width: pw, height: ph } = page.getSize();

      // Clamp coordinates to page bounds
      const x = Math.max(0, Math.min(pw, ann.x ?? 0));
      const y = Math.max(0, Math.min(ph, ann.y ?? 0));
      const w = Math.max(1, Math.min(pw - x, ann.width ?? 50));
      const h = Math.max(1, Math.min(ph - y, ann.height ?? 20));

      if (ann.type === 'redact') {
        // Permanent solid black box — actually removes visibility
        page.drawRectangle({ x, y, width: w, height: h, color: rgb(0, 0, 0) });
      } else if (ann.type === 'highlight') {
        const c = ann.color === 'green' ? rgb(0.6, 1, 0.6)
                : ann.color === 'blue'  ? rgb(0.6, 0.8, 1)
                : ann.color === 'pink'  ? rgb(1, 0.7, 0.85)
                : rgb(1, 0.95, 0.4); // default yellow
        page.drawRectangle({ x, y, width: w, height: h, color: c, opacity: 0.4 });
      } else if (ann.type === 'text' && ann.text) {
        page.drawText(String(ann.text).slice(0, 500), {
          x, y, size: ann.fontSize ?? 12, font, color: rgb(0.1, 0.1, 0.15),
          maxWidth: w,
        });
      }
    }

    const out = Buffer.from(await doc.save());
    return buildFileResponse(out, 'application/pdf', 'edited.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'edit-pdf');
  }
}
