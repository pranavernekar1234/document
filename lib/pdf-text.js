/**
 * @file lib/pdf-text.js
 * Text-extraction helper used by the AI Summarizer, Translate PDF, Compare
 * PDF, and OCR PDF tools.
 *
 * This intentionally does NOT use the `pdf-parse` package, for two reasons
 * found while testing this app's actual tools end-to-end:
 *
 *  1. `pdf-parse`'s top-level `index.js` has a "debug mode" branch that
 *     fires whenever `module.parent` is falsy — which is exactly what
 *     happens when it's loaded via a dynamic `import()` inside Next.js (in
 *     both `next dev` and the bundled server build). That branch
 *     synchronously reads a fixture file that only exists inside the
 *     package's own folder, throwing
 *     `ENOENT: no such file or directory, open './test/data/05-versions-space.pdf'`
 *     in any real deployment. This is the cause of the "AI Summarizer /
 *     Translate PDF: Processing failed (ENOENT)" bug.
 *  2. Even bypassing that (by importing pdf-parse's inner implementation
 *     module directly), pdf-parse vendors a very old, unmaintained copy of
 *     pdf.js (v1.10.100, from 2018) for the actual parsing. That version
 *     fails outright on some otherwise-valid modern PDFs — including, in
 *     testing, PDFs produced by this very app's own pdf-lib-based tools
 *     (compressed cross-reference streams, a PDF 1.5+ feature, trip up its
 *     old parser with "Unknown compression method in flate stream").
 *
 * This app already depends on `pdfjs-dist` (current, maintained) for the
 * Edit PDF and Redact PDF tools. Reusing it here for text extraction gives
 * one consistently-maintained PDF engine across the whole app instead of
 * two, and is verified to correctly parse documents the old pdf-parse
 * engine chokes on.
 */
import { ConversionError } from './stream-helpers.js';

let _pdfjs = null;

/** Lazily load pdfjs-dist's Node-compatible ("legacy") build. */
async function loadPdfjs() {
  if (_pdfjs) return _pdfjs;
  const mod = await import('pdfjs-dist/legacy/build/pdf.js');
  _pdfjs = mod.default ?? mod;
  return _pdfjs;
}

/**
 * @typedef {Object} ExtractedPdfText
 * @property {string} text       - Concatenated text across all parsed pages, pages separated by blank lines.
 * @property {number} pageCount  - Total number of pages in the document.
 * @property {number} pagesRead  - Number of pages actually parsed (respects `maxPages`).
 * @property {object|null} info  - Raw PDF info dictionary (title/author/etc.), if available.
 */

/**
 * Extract text content from a PDF buffer.
 * @param {Buffer} pdfBuffer
 * @param {{ maxPages?: number }} [opts]  `maxPages` of 0 (default) reads every page.
 * @returns {Promise<ExtractedPdfText>}
 */
export async function extractPdfText(pdfBuffer, opts = {}) {
  const { maxPages = 0 } = opts;
  const pdfjs = await loadPdfjs();

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;
  } catch (err) {
    throw new ConversionError(422, `Unable to read this PDF: ${err?.message ?? 'it may be encrypted or corrupted.'}`);
  }

  try {
    const pageCount = doc.numPages;
    const pagesToRead = maxPages > 0 ? Math.min(maxPages, pageCount) : pageCount;

    let info = null;
    try {
      const meta = await doc.getMetadata();
      info = meta?.info ?? null;
    } catch {
      // Metadata is best-effort; not every PDF has it.
    }

    const pageTexts = [];
    for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        pageTexts.push(joinTextItems(content.items));
      } catch {
        pageTexts.push(''); // one unreadable page shouldn't fail the whole document
      }
    }

    return {
      text: pageTexts.join('\n\n'),
      pageCount,
      pagesRead: pagesToRead,
      info,
    };
  } finally {
    try { await doc.destroy(); } catch { /* already destroyed */ }
  }
}

/**
 * Join pdfjs text items into a readable string, inserting a newline
 * whenever the vertical baseline (transform[5]) changes — i.e. a new line
 * of text on the page — mirroring how most PDF text extractors behave.
 * @param {Array<{ str: string; transform: number[] }>} items
 */
function joinTextItems(items) {
  let text = '';
  let lastY = null;
  for (const item of items) {
    const y = item.transform?.[5];
    if (lastY !== null && y !== lastY) text += '\n';
    text += item.str ?? '';
    lastY = y;
  }
  return text;
}
