export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ConversionError, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';
import { sanitizeForStandardFont } from '../../../../lib/pdf-processor.js';

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

    let doc;
    try { doc = await PDFDocument.load(buf); }
    catch { throw new ConversionError(422, 'Unable to load PDF. It may be encrypted — upload an unlocked PDF.'); }

    const signerName = sanitizeForStandardFont(fields.signerName?.trim() || 'Signed');
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Signature box on last page, bottom-right
    const boxW = 220, boxH = 60;
    const x = width - boxW - 40;
    const y = 30;

    // Box background
    lastPage.drawRectangle({
      x, y, width: boxW, height: boxH,
      color: rgb(0.97, 0.97, 1),
      borderColor: rgb(0.2, 0.4, 0.8),
      borderWidth: 1,
    });

    // Signature text (styled)
    lastPage.drawText(signerName, {
      x: x + 12, y: y + 30,
      size: 20,
      font,
      color: rgb(0.1, 0.2, 0.7),
    });

    // Timestamp line
    const now = new Date().toUTCString();
    lastPage.drawText(`Digitally signed · ${now}`, {
      x: x + 12, y: y + 10,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Seal mark — drawn as vector strokes rather than a text glyph, since
    // the ✓ character isn't representable in WinAnsi encoding and would
    // make pdf-lib throw ("WinAnsi cannot encode ✓") for every request.
    const sealCx = x + boxW - 22;
    const sealCy = y + 25;
    lastPage.drawLine({
      start: { x: sealCx - 6, y: sealCy },
      end: { x: sealCx - 2, y: sealCy - 5 },
      thickness: 2,
      color: rgb(0.1, 0.6, 0.3),
    });
    lastPage.drawLine({
      start: { x: sealCx - 2, y: sealCy - 5 },
      end: { x: sealCx + 7, y: sealCy + 7 },
      thickness: 2,
      color: rgb(0.1, 0.6, 0.3),
    });

    const signed = Buffer.from(await doc.save());
    return buildFileResponse(signed, 'application/pdf', 'signed.pdf');
  } catch (err) {
    return buildErrorResponse(err, 'sign');
  }
}
