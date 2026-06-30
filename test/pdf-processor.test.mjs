import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  mergePDFs, splitPDF, removePages, extractPages, rotatePDF, compressPDF,
  addPageNumbers, addWatermark, imagesToPDF, getPDFInfo, repairPDF,
  protectPDF, cropPDF, organizePDF, sanitizeForStandardFont,
} from '../lib/pdf-processor.js';
import { ConversionError } from '../lib/stream-helpers.js';
import { makeTestPdf, ONE_PX_PNG } from './helpers.mjs';

describe('mergePDFs', () => {
  test('merges multiple PDFs into one with the combined page count', async () => {
    const a = await makeTestPdf([['Page A1'], ['Page A2']]);
    const b = await makeTestPdf([['Page B1']]);
    const merged = await mergePDFs([a, b]);
    const doc = await PDFDocument.load(merged);
    assert.equal(doc.getPageCount(), 3);
  });

  test('rejects an empty file list', async () => {
    await assert.rejects(() => mergePDFs([]), ConversionError);
  });
});

describe('splitPDF', () => {
  test('splits every page individually when no ranges given', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3']]);
    const parts = await splitPDF(pdf, []);
    assert.equal(parts.length, 3);
    for (const part of parts) {
      const doc = await PDFDocument.load(part.buffer);
      assert.equal(doc.getPageCount(), 1);
    }
  });

  test('splits by explicit page ranges', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3'], ['4']]);
    const parts = await splitPDF(pdf, [{ from: 1, to: 2 }, { from: 3, to: 4 }]);
    assert.equal(parts.length, 2);
    const doc0 = await PDFDocument.load(parts[0].buffer);
    const doc1 = await PDFDocument.load(parts[1].buffer);
    assert.equal(doc0.getPageCount(), 2);
    assert.equal(doc1.getPageCount(), 2);
  });
});

describe('removePages / extractPages', () => {
  test('removePages keeps all but the specified pages', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3']]);
    const result = await removePages(pdf, [2]);
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 2);
  });

  test('removePages rejects removing every page', async () => {
    const pdf = await makeTestPdf([['1'], ['2']]);
    await assert.rejects(() => removePages(pdf, [1, 2]), ConversionError);
  });

  test('extractPages keeps only the specified pages', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3']]);
    const result = await extractPages(pdf, [1, 3]);
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 2);
  });

  test('extractPages rejects when no valid page numbers given', async () => {
    const pdf = await makeTestPdf([['1']]);
    await assert.rejects(() => extractPages(pdf, [99]), ConversionError);
  });
});

describe('rotatePDF', () => {
  test('rotates all pages by the given angle when no pages specified', async () => {
    const pdf = await makeTestPdf([['1'], ['2']]);
    const result = await rotatePDF(pdf, [], 90);
    const doc = await PDFDocument.load(result);
    for (const page of doc.getPages()) {
      assert.equal(page.getRotation().angle, 90);
    }
  });

  test('rotation is additive and wraps at 360', async () => {
    const pdf = await makeTestPdf([['1']]);
    const once = await rotatePDF(pdf, [], 270);
    const twice = await rotatePDF(once, [], 180);
    const doc = await PDFDocument.load(twice);
    assert.equal(doc.getPage(0).getRotation().angle, (270 + 180) % 360);
  });

  test('only rotates the specified pages', async () => {
    const pdf = await makeTestPdf([['1'], ['2']]);
    const result = await rotatePDF(pdf, [1], 90);
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPage(0).getRotation().angle, 90);
    assert.equal(doc.getPage(1).getRotation().angle, 0);
  });
});

describe('compressPDF', () => {
  test('returns a valid, openable PDF', async () => {
    const pdf = await makeTestPdf([['Some content to compress']]);
    const result = await compressPDF(pdf, 'high');
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 1);
  });
});

describe('addPageNumbers', () => {
  test('produces a valid PDF with the same page count', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3']]);
    const result = await addPageNumbers(pdf, { prefix: 'Page ' });
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 3);
  });

  test('does not throw when the prefix contains unsupported characters', async () => {
    const pdf = await makeTestPdf([['1']]);
    await assert.doesNotReject(() => addPageNumbers(pdf, { prefix: '★ Page ' }));
  });
});

describe('addWatermark', () => {
  test('produces a valid PDF with the same page count', async () => {
    const pdf = await makeTestPdf([['1'], ['2']]);
    const result = await addWatermark(pdf, { text: 'CONFIDENTIAL' });
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 2);
  });

  test('does not throw on emoji/CJK watermark text (previously crashed)', async () => {
    const pdf = await makeTestPdf([['1']]);
    await assert.doesNotReject(() => addWatermark(pdf, { text: '🔒 机密文件' }));
  });
});

describe('sanitizeForStandardFont', () => {
  test('passes through plain ASCII unchanged', () => {
    assert.equal(sanitizeForStandardFont('Hello World 123'), 'Hello World 123');
  });

  test('strips characters outside WinAnsi range', () => {
    assert.equal(sanitizeForStandardFont('Hello 你好 World'), 'Hello  World');
  });

  test('falls back to a placeholder when nothing survives', () => {
    assert.equal(sanitizeForStandardFont('你好'), '(unsupported characters)');
  });

  test('keeps Latin-1 accented characters', () => {
    assert.equal(sanitizeForStandardFont('Café Müller'), 'Café Müller');
  });
});

describe('imagesToPDF', () => {
  test('builds a PDF with one page per image', async () => {
    const result = await imagesToPDF([
      { buffer: ONE_PX_PNG, mimeType: 'image/png' },
      { buffer: ONE_PX_PNG, mimeType: 'image/png' },
    ]);
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 2);
  });
});

describe('getPDFInfo', () => {
  test('returns page count for a valid PDF', async () => {
    const pdf = await makeTestPdf([['1'], ['2'], ['3'], ['4']]);
    const info = await getPDFInfo(pdf);
    assert.equal(info.pageCount, 4);
  });

  test('rejects a non-PDF buffer', async () => {
    await assert.rejects(() => getPDFInfo(Buffer.from('not a pdf')), ConversionError);
  });
});

describe('cropPDF', () => {
  test('produces a valid PDF with the requested crop box', async () => {
    const pdf = await makeTestPdf([['1']], { width: 400, height: 300 });
    const result = await cropPDF(pdf, { x: 0, y: 0, width: 200, height: 150 });
    const doc = await PDFDocument.load(result);
    const { width, height } = doc.getPage(0).getSize();
    assert.equal(width, 200);
    assert.equal(height, 150);
  });
});

describe('organizePDF', () => {
  test('reorders pages according to newOrder', async () => {
    const pdf = await makeTestPdf([['first'], ['second'], ['third']]);
    const result = await organizePDF(pdf, [3, 1, 2]);
    const doc = await PDFDocument.load(result);
    assert.equal(doc.getPageCount(), 3);
  });

  test('rejects an empty/invalid order', async () => {
    const pdf = await makeTestPdf([['1']]);
    await assert.rejects(() => organizePDF(pdf, [99]), ConversionError);
  });
});

describe('protectPDF', () => {
  test('validates a PDF and reports encryption is unsupported locally', async () => {
    const pdf = await makeTestPdf([['1']]);
    const result = await protectPDF(pdf);
    assert.equal(result.supported, false);
  });

  test('rejects a non-PDF buffer', async () => {
    await assert.rejects(() => protectPDF(Buffer.from('nope')), ConversionError);
  });
});

describe('repairPDF', () => {
  test('repairs a structurally valid PDF and reports recovered pages', async () => {
    const pdf = await makeTestPdf([['1'], ['2']]);
    const result = await repairPDF(pdf);
    assert.equal(result.recoveredPages, 2);
    const doc = await PDFDocument.load(result.buffer);
    assert.equal(doc.getPageCount(), 2);
  });

  test('rejects a buffer with no %PDF header', async () => {
    await assert.rejects(() => repairPDF(Buffer.from('definitely not a pdf')), ConversionError);
  });

  test('rejects a severely truncated/corrupted PDF rather than returning a broken file', async () => {
    const pdf = await makeTestPdf([['1']]);
    const truncated = pdf.slice(0, Math.floor(pdf.length * 0.5));
    await assert.rejects(() => repairPDF(truncated), ConversionError);
  });
});
