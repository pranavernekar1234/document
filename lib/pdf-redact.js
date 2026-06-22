/**
 * @file lib/pdf-redact.js
 * Automatic redaction for the "Redact PDF" tool.
 *
 * The Redact PDF UI is a plain file-upload tool — it doesn't collect a
 * search term or let the user draw a region (that's the Edit PDF tool's
 * canvas editor). So redaction here is necessarily automatic: the page text
 * is scanned for common sensitive-data patterns (emails, phone numbers,
 * SSNs, credit-card-like numbers), and a solid black box is drawn over each
 * match's location on the page.
 *
 * Implementation notes / honest limitations:
 *  - Text positions come from `pdfjs-dist`'s `getTextContent()` (legacy
 *    Node build — works without a `canvas` package since we only need text
 *    geometry, not rendering).
 *  - pdfjs text "items" are often whole lines/runs rather than individual
 *    words, so the bounding box of a regex match within an item is
 *    estimated proportionally by character position within that item's
 *    width. This is a good approximation for most fonts but isn't exact —
 *    boxes are padded outward to make sure the match is fully covered.
 *  - This draws an opaque box over the matched content (so it's hidden from
 *    view and from anything printed/exported from a flattened render). It
 *    does NOT strip the underlying text operators out of the PDF's content
 *    stream — pdf-lib doesn't expose that level of content-stream surgery.
 *    For content that must be unrecoverable under forensic inspection, the
 *    document should also be flattened to images (e.g. via the PDF→JPG→PDF
 *    round trip) after redaction.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import { ConversionError } from './stream-helpers.js';

/** Matches common PII shapes. Order doesn't matter; results are merged. */
const PII_PATTERNS = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // US-style phone numbers: (555) 123-4567, 555-123-4567, +1 555.123.4567
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
  // US Social Security Numbers: 123-45-6789
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Credit-card-style grouped numbers: 4111-1111-1111-1111 / 4111 1111 1111 1111
  /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{1,7}\b/g,
  // Unbroken 16-digit card numbers
  /\b\d{16}\b/g,
];

/**
 * Find all PII matches in a string as [start, end) index spans, merging
 * overlapping spans from different patterns.
 * @param {string} text
 * @returns {[number, number][]}
 */
function findPiiSpans(text) {
  const spans = [];
  for (const pattern of PII_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length]);
      if (m[0].length === 0) pattern.lastIndex++; // safety against zero-width matches
    }
  }
  if (spans.length === 0) return [];
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [spans[0]];
  for (const [s, e] of spans.slice(1)) {
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

/**
 * Redact a PDF buffer by drawing black boxes over auto-detected PII.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ buffer: Buffer; redactionCount: number }>}
 */
export async function redactPDF(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
    throw new ConversionError(422, 'This file does not appear to be a PDF.');
  }

  const mod = await import('pdfjs-dist/legacy/build/pdf.js');
  const pdfjs = mod.default ?? mod;

  let srcDoc;
  try {
    srcDoc = await pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;
  } catch {
    throw new ConversionError(422, 'Unable to read this PDF. It may be encrypted or corrupted.');
  }

  /** @type {Map<number, { x: number; y: number; width: number; height: number }[]>} */
  const boxesByPage = new Map();
  let redactionCount = 0;

  try {
    for (let pageNum = 1; pageNum <= srcDoc.numPages; pageNum++) {
      const page = await srcDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const boxes = [];

      // Build the page's full text plus a map from character offset -> item.
      let fullText = '';
      const offsetMap = []; // offsetMap[i] = { item, charIndexInItem }
      for (const item of content.items) {
        const str = item.str ?? '';
        for (let i = 0; i < str.length; i++) {
          offsetMap.push({ item, charIndexInItem: i });
        }
        fullText += str;
        if (item.hasEOL) {
          fullText += '\n';
          offsetMap.push(null); // newline has no source item
        }
      }

      const spans = findPiiSpans(fullText);
      for (const [start, end] of spans) {
        // Group the span's characters by source item so multi-item spans
        // produce one box per item instead of one box spanning everything.
        const byItem = new Map();
        for (let i = start; i < end && i < offsetMap.length; i++) {
          const entry = offsetMap[i];
          if (!entry) continue;
          const arr = byItem.get(entry.item) ?? [];
          arr.push(entry.charIndexInItem);
          byItem.set(entry.item, arr);
        }
        if (byItem.size === 0) continue;
        redactionCount++;

        for (const [item, charIndices] of byItem) {
          const len = item.str.length || 1;
          const minIdx = Math.min(...charIndices);
          const maxIdx = Math.max(...charIndices) + 1;
          const widthPerChar = item.width / len;
          const xStart = minIdx * widthPerChar;
          const xEnd = maxIdx * widthPerChar;

          // item.transform = [a, b, c, d, e, f] — for axis-aligned text,
          // (e, f) is the baseline origin and `a`/`d` approximate the glyph
          // scale. Pad generously so the box fully covers the glyphs.
          const [a, , , d, e, f] = item.transform;
          const pad = 1.5;
          boxes.push({
            x: e + xStart - pad,
            y: f - pad,
            width: (xEnd - xStart) + pad * 2,
            height: (item.height || Math.abs(d) || 12) + pad * 2,
          });
        }
      }

      if (boxes.length) boxesByPage.set(pageNum - 1, boxes);
    }
  } finally {
    try { await srcDoc.destroy(); } catch { /* no-op */ }
  }

  // Apply the boxes with pdf-lib, which we use purely for drawing/saving.
  const outDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
  const pages = outDoc.getPages();
  for (const [pageIndex, boxes] of boxesByPage) {
    const page = pages[pageIndex];
    if (!page) continue;
    for (const box of boxes) {
      page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(0, 0, 0) });
    }
  }

  const bytes = await outDoc.save();
  return { buffer: Buffer.from(bytes), redactionCount };
}
