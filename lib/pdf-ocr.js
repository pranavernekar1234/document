/**
 * @file lib/pdf-ocr.js
 * Real implementation for the "OCR PDF" tool.
 *
 * Two paths:
 *  1. The PDF already has an extractable text layer (the overwhelming
 *     majority of "PDF" uploads, including ones exported from Word/Acrobat/
 *     browsers) — there's nothing to OCR, so it's returned unchanged. This
 *     path needs no external services and runs in well under a second.
 *  2. The PDF has no extractable text (a scanned/image-only PDF) — each
 *     page is rasterized via the existing ConvertAPI pipeline (the same one
 *     the PDF→JPG tool already uses), then OCR'd with tesseract.js. The
 *     recognized words are written back as an invisible, position-matched
 *     text layer over the page image using pdf-lib's low-level content
 *     stream operators (PDF text-rendering mode 3 = invisible but
 *     selectable/searchable) — producing a genuinely searchable PDF.
 *
 * Known constraints (documented honestly rather than silently assumed):
 *  - Path 2 requires `CONVERTAPI_SECRET` for rasterization (same as every
 *    other raster-dependent tool in this app — Netlify/Vercel functions
 *    can't bundle Ghostscript).
 *  - tesseract.js downloads its language model (~10-15MB for English) from
 *    its own CDN on first use per cold start. This is standard practice for
 *    OCR-in-the-browser/Node tooling (the model is too large to reasonably
 *    vendor into the app bundle) — unlike the pdf.js *worker script*, which
 *    is small and is bundled locally (see lib/pdf-redact.js's neighbour,
 *    scripts/copy-pdf-worker.js, for that fix).
 *  - OCR is the slowest tool in this app. Multi-page scanned PDFs may take
 *    well beyond typical serverless function time limits — see the
 *    `maxDuration` export in the route and consider a background/queue-based
 *    job for production scale with large documents.
 */
import os from 'node:os';
import { PDFDocument, PDFOperator, PDFOperatorNames, PDFNumber, StandardFonts } from 'pdf-lib';
import { extractPdfText } from './pdf-text.js';
import { convertPdfToImages } from './conversion-service.js';
import { ConversionError } from './stream-helpers.js';

const MIN_TEXT_LENGTH_TO_SKIP_OCR = 20; // a handful of stray characters isn't "has text"

/**
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ buffer: Buffer; alreadySearchable: boolean; pageCount: number; ocrPages: number }>}
 */
export async function ocrPDF(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
    throw new ConversionError(422, 'This file does not appear to be a PDF.');
  }

  // ── Path 1: already searchable — nothing to do ─────────────────────────
  const { text, pageCount } = await extractPdfText(pdfBuffer, { maxPages: 10 });
  if ((text ?? '').trim().length >= MIN_TEXT_LENGTH_TO_SKIP_OCR) {
    return { buffer: pdfBuffer, alreadySearchable: true, pageCount, ocrPages: 0 };
  }

  // ── Path 2: scanned/image-only — rasterize + OCR ───────────────────────
  if (!process.env.CONVERTAPI_SECRET) {
    throw new ConversionError(
      500,
      'This PDF has no extractable text (it looks scanned). OCR for scanned pages requires a configured conversion provider — set CONVERTAPI_SECRET in your environment.',
    );
  }

  const images = await convertPdfToImages(pdfBuffer); // [{ data: base64 jpg, page, filename }]
  if (!images.length) {
    throw new ConversionError(502, 'Could not rasterize this PDF for OCR.');
  }
  // Bound worst-case OCR time for very long scanned documents.
  const MAX_OCR_PAGES = 25;
  const pagesToProcess = images.slice(0, MAX_OCR_PAGES);

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, { cachePath: os.tmpdir() });

  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  try {
    for (const img of pagesToProcess) {
      const imgBuffer = Buffer.from(img.data, 'base64');
      const embeddedImage = await outDoc.embedJpg(imgBuffer);
      const { width: pageW, height: pageH } = embeddedImage;

      const page = outDoc.addPage([pageW, pageH]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width: pageW, height: pageH });

      const { data } = await worker.recognize(imgBuffer, {}, { text: true, blocks: true });
      const words = flattenWords(data.blocks);

      for (const word of words) {
        const text = word.text?.trim();
        if (!text) continue;
        const { x0, y0, x1, y1 } = word.bbox;
        const wordHeightPx = Math.max(1, y1 - y0);
        const fontSize = Math.max(4, wordHeightPx * 0.85);
        // Image pixel space has a top-left origin; PDF page space has a
        // bottom-left origin (1 image pixel == 1 PDF point here, since the
        // page was sized exactly to the image's pixel dimensions above).
        const pdfX = x0;
        const pdfY = pageH - y1;

        // Render mode 3 = invisible (neither filled nor stroked) but still
        // a real text object, so it's selectable/searchable/copyable.
        page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(3)]));
        page.drawText(sanitizeForWinAnsi(text), { x: pdfX, y: pdfY, size: fontSize, font });
        page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(0)]));
      }
    }
  } finally {
    await worker.terminate();
  }

  const bytes = await outDoc.save();
  return {
    buffer: Buffer.from(bytes),
    alreadySearchable: false,
    pageCount: images.length,
    ocrPages: pagesToProcess.length,
  };
}

/** Flatten tesseract.js's blocks → paragraphs → lines → words tree. */
function flattenWords(blocks) {
  const out = [];
  for (const block of blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          out.push(word);
        }
      }
    }
  }
  return out;
}

/**
 * pdf-lib's StandardFonts.Helvetica only supports WinAnsi-encodable
 * characters. OCR output occasionally contains stray glyphs outside that
 * range — strip them rather than letting drawText() throw and abort the
 * whole page's text layer.
 */
function sanitizeForWinAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x00-\xFF]/g, '');
}
