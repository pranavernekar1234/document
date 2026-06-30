/**
 * @file lib/pdf-compare.js
 * Real implementation for the "Compare PDF" tool: extracts text from two
 * PDFs, computes a line-level diff, and renders a readable diff report as a
 * new downloadable PDF (so it fits the existing single-PDF-download UI
 * without needing any UI changes).
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfText } from './pdf-text.js';
import { sanitizeForStandardFont } from './pdf-processor.js';
import { ConversionError } from './stream-helpers.js';

const MAX_LINES = 1200; // bounds the O(n*m) diff table for very long documents

/**
 * Classic LCS-based line diff. Returns an ordered list of operations
 * describing how to turn `a` into `b`.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {{ type: 'same'|'removed'|'added'; line: string }[]}
 */
function diffLines(a, b) {
  const n = a.length, m = b.length;
  // dp[i][j] = length of LCS of a[i:], b[j:]
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', line: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'removed', line: a[i] });
      i++;
    } else {
      ops.push({ type: 'added', line: b[j] });
      j++;
    }
  }
  while (i < n) { ops.push({ type: 'removed', line: a[i] }); i++; }
  while (j < m) { ops.push({ type: 'added', line: b[j] }); j++; }
  return ops;
}

/**
 * Normalize extracted PDF text into comparable lines: collapse internal
 * whitespace per line, drop blank lines, cap the total line count.
 * @param {string} text
 * @returns {string[]}
 */
function toLines(text) {
  const lines = (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return lines.slice(0, MAX_LINES);
}

/**
 * Compare two PDF buffers and render a diff-report PDF.
 * @param {Buffer} bufferA
 * @param {Buffer} bufferB
 * @param {{ nameA?: string; nameB?: string }} [labels]
 * @returns {Promise<Buffer>}
 */
export async function comparePDFs(bufferA, bufferB, labels = {}) {
  const nameA = labels.nameA || 'Document A';
  const nameB = labels.nameB || 'Document B';

  const [extractedA, extractedB] = await Promise.all([
    extractPdfText(bufferA, { maxPages: 60 }),
    extractPdfText(bufferB, { maxPages: 60 }),
  ]);

  const linesA = toLines(extractedA.text);
  const linesB = toLines(extractedB.text);

  if (linesA.length === 0 && linesB.length === 0) {
    throw new ConversionError(
      422,
      'No extractable text was found in either PDF. Scanned/image-only PDFs need OCR before they can be compared.',
    );
  }

  const ops = diffLines(linesA, linesB);
  const added = ops.filter((o) => o.type === 'added').length;
  const removed = ops.filter((o) => o.type === 'removed').length;
  const same = ops.filter((o) => o.type === 'same').length;
  const totalLines = Math.max(linesA.length, linesB.length, 1);
  const similarity = Math.round((same / totalLines) * 100);

  return renderDiffReport({
    nameA, nameB,
    pageCountA: extractedA.pageCount,
    pageCountB: extractedB.pageCount,
    added, removed, similarity,
    ops,
  });
}

/**
 * Render a diff op list into a multi-page PDF report using pdf-lib.
 * @returns {Promise<Buffer>}
 */
async function renderDiffReport({ nameA, nameB, pageCountA, pageCountB, added, removed, similarity, ops }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28, pageHeight = 841.89; // A4
  const margin = 48;
  const lineHeight = 14;
  const fontSize = 9.5;
  const maxCharsPerLine = 98; // wrap width at this font size/margins

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };
  const ensureSpace = (needed = lineHeight) => {
    if (y - needed < margin) newPage();
  };
  const drawLine = (text, { size = fontSize, f = font, color = rgb(0.15, 0.15, 0.18), indent = 0 } = {}) => {
    ensureSpace(lineHeight);
    page.drawText(sanitizeForStandardFont(text), { x: margin + indent, y, size, font: f, color, maxWidth: pageWidth - margin * 2 - indent });
    y -= lineHeight;
  };
  const wrap = (text) => {
    const out = [];
    let remaining = text;
    while (remaining.length > maxCharsPerLine) {
      let cut = remaining.lastIndexOf(' ', maxCharsPerLine);
      if (cut <= 0) cut = maxCharsPerLine;
      out.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trim();
    }
    out.push(remaining);
    return out;
  };

  // ── Title / summary ──────────────────────────────────────────────────
  drawLine('PDF Comparison Report', { size: 20, f: bold, color: rgb(0.06, 0.09, 0.16) });
  y -= 6;
  drawLine(`Generated ${new Date().toUTCString()}`, { size: 9, color: rgb(0.45, 0.47, 0.52) });
  y -= 10;

  drawLine(`A: ${nameA}  (${pageCountA ?? '?'} page${pageCountA === 1 ? '' : 's'})`, { f: bold, size: 11 });
  drawLine(`B: ${nameB}  (${pageCountB ?? '?'} page${pageCountB === 1 ? '' : 's'})`, { f: bold, size: 11 });
  y -= 6;

  drawLine(`Similarity: ${similarity}%   ·   ${removed} line${removed === 1 ? '' : 's'} removed   ·   ${added} line${added === 1 ? '' : 's'} added`, {
    size: 10.5, color: rgb(0.2, 0.22, 0.28),
  });
  y -= 14;

  const changed = ops.filter((o) => o.type !== 'same');
  if (changed.length === 0) {
    drawLine('No textual differences were detected between these documents.', { f: bold, color: rgb(0.1, 0.5, 0.25) });
  } else {
    drawLine('Differences', { size: 13, f: bold });
    y -= 4;

    for (const op of ops) {
      if (op.type === 'same') continue;
      const marker = op.type === 'removed' ? '-' : '+';
      const color = op.type === 'removed' ? rgb(0.75, 0.15, 0.15) : rgb(0.07, 0.45, 0.2);
      const wrapped = wrap(op.line);
      wrapped.forEach((chunk, idx) => {
        drawLine(`${idx === 0 ? marker + ' ' : '  '}${chunk}`, { color });
      });
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
