/**
 * @file test/helpers.mjs
 * Shared helpers for building sample PDFs in tests, so individual test
 * files don't each re-implement PDF construction.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Build a simple multi-page PDF with text on each page.
 * @param {string[][]} pagesOfLines - one array of lines per page
 * @param {{ width?: number; height?: number }} [size]
 * @returns {Promise<Buffer>}
 */
export async function makeTestPdf(pagesOfLines = [['Hello world']], size = {}) {
  const { width = 400, height = 300 } = size;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pagesOfLines) {
    const page = doc.addPage([width, height]);
    let y = height - 40;
    for (const line of lines) {
      page.drawText(line, { x: 20, y, size: 12, font, color: rgb(0, 0, 0) });
      y -= 20;
    }
  }
  return Buffer.from(await doc.save());
}

/** A 1x1 PNG pixel — minimal valid image buffer for image-related tests. */
export const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
