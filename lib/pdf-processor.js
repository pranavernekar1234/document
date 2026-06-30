/**
 * @file lib/pdf-processor.js
 * Core PDF processing engine using pdf-lib for in-process operations.
 * No external API required for these operations.
 */

import { PDFDocument, degrees, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { ConversionError, buildFileResponse } from './stream-helpers.js';

/**
 * pdf-lib's built-in StandardFonts (Helvetica, etc.) can only encode
 * WinAnsi (cp1252) characters — both `font.widthOfTextAtSize()` and
 * `page.drawText()` throw `UnsupportedEncodingError` for anything outside
 * that range. Without sanitizing first, a user typing emoji, CJK text, or
 * many typographic symbols (✓, ★, →, …) into a watermark, page-number
 * prefix, or signature name field would make the whole request fail with
 * an unhandled 500. This strips unencodable characters up front so the
 * operation always completes.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeForStandardFont(text) {
  // eslint-disable-next-line no-control-regex
  const stripped = (text ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim();
  return stripped.length ? stripped : '(unsupported characters)';
}

// ── MERGE ─────────────────────────────────────────────────────────────────────
/**
 * Merge multiple PDF buffers into a single PDF.
 * @param {Buffer[]} pdfBuffers
 * @returns {Promise<Buffer>}
 */
export async function mergePDFs(pdfBuffers) {
  if (!pdfBuffers || pdfBuffers.length < 1) {
    throw new ConversionError(400, 'At least one PDF file is required to merge.');
  }
  const merged = await PDFDocument.create();
  for (let i = 0; i < pdfBuffers.length; i++) {
    let src;
    try {
      src = await PDFDocument.load(pdfBuffers[i]);
    } catch {
      throw new ConversionError(422, `File ${i + 1} is not a valid PDF document.`);
    }
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  return Buffer.from(bytes);
}

// ── SPLIT ─────────────────────────────────────────────────────────────────────
/**
 * Split a PDF into multiple PDFs based on page ranges.
 * @param {Buffer} pdfBuffer
 * @param {{ from: number; to: number }[]} ranges  - 1-indexed page ranges
 * @returns {Promise<{ buffer: Buffer; label: string }[]>}
 */
export async function splitPDF(pdfBuffer, ranges) {
  let src;
  try { src = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const totalPages = src.getPageCount();
  if (!ranges || ranges.length === 0) {
    // Default: split every page individually
    const results = [];
    for (let i = 0; i < totalPages; i++) {
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      results.push({ buffer: Buffer.from(await doc.save()), label: `page-${i + 1}` });
    }
    return results;
  }

  const results = [];
  for (const range of ranges) {
    const from = Math.max(1, range.from) - 1;
    const to   = Math.min(totalPages, range.to) - 1;
    const doc  = await PDFDocument.create();
    const indices = Array.from({ length: to - from + 1 }, (_, k) => from + k);
    const pages = await doc.copyPages(src, indices);
    pages.forEach(p => doc.addPage(p));
    results.push({ buffer: Buffer.from(await doc.save()), label: `pages-${from + 1}-${to + 1}` });
  }
  return results;
}

// ── REMOVE / EXTRACT PAGES ────────────────────────────────────────────────────
/**
 * Remove specific pages from a PDF.
 * @param {Buffer} pdfBuffer
 * @param {number[]} pageNumbers - 1-indexed
 * @returns {Promise<Buffer>}
 */
export async function removePages(pdfBuffer, pageNumbers) {
  let src;
  try { src = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const total = src.getPageCount();
  const removeSet = new Set(pageNumbers.map(n => n - 1));
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(i => !removeSet.has(i));

  if (keepIndices.length === 0) throw new ConversionError(400, 'Cannot remove all pages from a PDF.');

  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, keepIndices);
  pages.forEach(p => doc.addPage(p));
  return Buffer.from(await doc.save());
}

/**
 * Extract specific pages from a PDF into a new document.
 * @param {Buffer} pdfBuffer
 * @param {number[]} pageNumbers - 1-indexed
 * @returns {Promise<Buffer>}
 */
export async function extractPages(pdfBuffer, pageNumbers) {
  let src;
  try { src = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const total = src.getPageCount();
  const indices = pageNumbers.map(n => n - 1).filter(i => i >= 0 && i < total);
  if (indices.length === 0) throw new ConversionError(400, 'No valid page numbers specified.');

  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach(p => doc.addPage(p));
  return Buffer.from(await doc.save());
}

// ── ROTATE ────────────────────────────────────────────────────────────────────
/**
 * Rotate pages in a PDF.
 * @param {Buffer} pdfBuffer
 * @param {number[]} pageNumbers - 1-indexed; empty = all pages
 * @param {90|180|270} angle
 * @returns {Promise<Buffer>}
 */
export async function rotatePDF(pdfBuffer, pageNumbers, angle = 90) {
  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const total = doc.getPageCount();
  const targets = pageNumbers && pageNumbers.length > 0
    ? pageNumbers.map(n => n - 1).filter(i => i >= 0 && i < total)
    : Array.from({ length: total }, (_, i) => i);

  for (const idx of targets) {
    const page = doc.getPage(idx);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return Buffer.from(await doc.save());
}

// ── COMPRESS ──────────────────────────────────────────────────────────────────
/**
 * Compress a PDF by re-saving with pdf-lib (removes unused objects/streams).
 * Note: for aggressive compression, use Ghostscript via ConvertAPI/CloudConvert.
 * @param {Buffer} pdfBuffer
 * @param {'low'|'medium'|'high'} level
 * @returns {Promise<Buffer>}
 */
export async function compressPDF(pdfBuffer, level = 'medium') {
  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  // pdf-lib's save with objectsPerTick and useObjectStreams reduces size
  const saveOptions = {
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: level === 'high' ? 25 : level === 'medium' ? 50 : 100,
  };

  const bytes = await doc.save(saveOptions);
  return Buffer.from(bytes);
}

// ── ADD PAGE NUMBERS ──────────────────────────────────────────────────────────
/**
 * Add page numbers to every page of a PDF.
 * @param {Buffer} pdfBuffer
 * @param {{ position?: string; startFrom?: number; fontSize?: number; prefix?: string }} opts
 * @returns {Promise<Buffer>}
 */
export async function addPageNumbers(pdfBuffer, opts = {}) {
  const { position = 'bottom-center', startFrom = 1, fontSize = 12, prefix = '' } = opts;

  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const text = sanitizeForStandardFont(`${prefix}${startFrom + i}`);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let x, y;
    switch (position) {
      case 'bottom-left':   x = 40;                        y = 30; break;
      case 'bottom-right':  x = width - textWidth - 40;   y = 30; break;
      case 'top-left':      x = 40;                        y = height - 40; break;
      case 'top-right':     x = width - textWidth - 40;   y = height - 40; break;
      case 'top-center':    x = (width - textWidth) / 2;  y = height - 40; break;
      default:              x = (width - textWidth) / 2;  y = 30;
    }

    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) });
  }
  return Buffer.from(await doc.save());
}

// ── WATERMARK ─────────────────────────────────────────────────────────────────
/**
 * Add a text watermark to every page of a PDF.
 * @param {Buffer} pdfBuffer
 * @param {{ text: string; opacity?: number; fontSize?: number; color?: string; rotation?: number }} opts
 * @returns {Promise<Buffer>}
 */
export async function addWatermark(pdfBuffer, opts = {}) {
  const { text: rawText = 'CONFIDENTIAL', opacity = 0.15, fontSize = 60, rotation = 45 } = opts;
  const text = sanitizeForStandardFont(rawText);

  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: (height - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  }
  return Buffer.from(await doc.save());
}

// ── IMAGES → PDF ──────────────────────────────────────────────────────────────
/**
 * Convert image buffers (JPG/PNG) into a PDF document.
 * @param {{ buffer: Buffer; mimeType: string }[]} images
 * @returns {Promise<Buffer>}
 */
export async function imagesToPDF(images) {
  if (!images || images.length === 0) throw new ConversionError(400, 'No images provided.');
  const doc = await PDFDocument.create();

  for (const { buffer, mimeType } of images) {
    let img;
    try {
      if (mimeType === 'image/png' || buffer[0] === 0x89) {
        img = await doc.embedPng(buffer);
      } else {
        img = await doc.embedJpg(buffer);
      }
    } catch {
      throw new ConversionError(422, 'One or more uploaded files is not a valid image (JPG or PNG).');
    }
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return Buffer.from(await doc.save());
}

// ── PDF → JPG (page info) ─────────────────────────────────────────────────────
/**
 * Get metadata about PDF pages for client-side display.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ pageCount: number; title: string; author: string }>}
 */
export async function getPDFInfo(pdfBuffer) {
  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  return {
    pageCount: doc.getPageCount(),
    title:  doc.getTitle()  ?? '',
    author: doc.getAuthor() ?? '',
  };
}

// ── REPAIR ────────────────────────────────────────────────────────────────────
/**
 * Attempt to repair a corrupted/damaged PDF.
 *
 * Strategy: pdf-lib's parser is already lenient by default (it skips
 * malformed objects rather than aborting). We first try a normal load, then
 * retry with progressively more permissive parsing options if that fails.
 * Once any version of the document loads, we rebuild a brand-new PDF by
 * copying over every page we can read — this round-trip discards a damaged
 * xref table, broken trailer, or orphaned objects from the original file
 * and re-serializes a clean, well-formed document from whatever content
 * was actually recoverable.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ buffer: Buffer; recoveredPages: number; originalPages: number | null }>}
 */
export async function repairPDF(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length < 5 || pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
    throw new ConversionError(422, 'This file does not appear to be a PDF (missing %PDF header).');
  }

  /** @type {import('pdf-lib').PDFDocument | null} */
  let src = null;
  let originalPages = null;

  // Attempt 1: normal load (pdf-lib is already lenient about minor corruption).
  try {
    src = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
  } catch {
    // Attempt 2: maximally permissive parsing — ignore encryption flags,
    // never throw on individual invalid objects, and clamp out-of-range
    // numeric values instead of failing the whole parse.
    try {
      src = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
        capNumbers: true,
      });
    } catch {
      throw new ConversionError(
        422,
        'This PDF is too badly damaged to repair automatically. Its core structure could not be parsed.',
      );
    }
  }

  try { originalPages = src.getPageCount(); } catch { originalPages = null; }

  // Rebuild a fresh document from whatever pages were actually readable.
  const rebuilt = await PDFDocument.create();
  const indices = Array.from({ length: src.getPageCount() }, (_, i) => i);

  let copiedPages = [];
  try {
    copiedPages = await rebuilt.copyPages(src, indices);
  } catch {
    // Some PDFs fail a bulk copy but succeed page-by-page (one bad page
    // shouldn't sink the whole recovery) — fall back to copying individually.
    copiedPages = [];
    for (const i of indices) {
      try {
        const [page] = await rebuilt.copyPages(src, [i]);
        copiedPages.push(page);
      } catch {
        // Skip pages that genuinely can't be recovered.
      }
    }
  }

  if (copiedPages.length === 0) {
    throw new ConversionError(422, 'No readable pages could be recovered from this PDF.');
  }

  copiedPages.forEach((p) => rebuilt.addPage(p));
  const bytes = await rebuilt.save();

  return {
    buffer: Buffer.from(bytes),
    recoveredPages: copiedPages.length,
    originalPages,
  };
}

// ── PROTECT ───────────────────────────────────────────────────────────────────
/**
 * Add user password to a PDF document.
 * Note: pdf-lib doesn't support PDF encryption natively.
 * This validates the PDF and returns it with metadata noting encryption
 * is handled by the upstream service.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ supported: false }>}
 */
export async function protectPDF(pdfBuffer) {
  // PDF encryption requires Ghostscript or ConvertAPI
  let doc;
  try { await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }
  return { supported: false };
}

// ── CROP ──────────────────────────────────────────────────────────────────────
/**
 * Crop all pages of a PDF to a specific rectangle.
 * @param {Buffer} pdfBuffer
 * @param {{ x: number; y: number; width: number; height: number }} cropBox
 * @returns {Promise<Buffer>}
 */
export async function cropPDF(pdfBuffer, cropBox) {
  let doc;
  try { doc = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const pages = doc.getPages();
  for (const page of pages) {
    page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    page.setMediaBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
  }
  return Buffer.from(await doc.save());
}

// ── ORGANIZE (rearrange) ──────────────────────────────────────────────────────
/**
 * Rearrange pages in a PDF according to a new order.
 * @param {Buffer} pdfBuffer
 * @param {number[]} newOrder - 1-indexed page numbers in desired order
 * @returns {Promise<Buffer>}
 */
export async function organizePDF(pdfBuffer, newOrder) {
  let src;
  try { src = await PDFDocument.load(pdfBuffer); }
  catch { throw new ConversionError(422, 'Not a valid PDF document.'); }

  const total = src.getPageCount();
  const indices = newOrder.map(n => n - 1).filter(i => i >= 0 && i < total);
  if (indices.length === 0) throw new ConversionError(400, 'No valid page order specified.');

  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach(p => doc.addPage(p));
  return Buffer.from(await doc.save());
}
