import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { comparePDFs } from '../lib/pdf-compare.js';
import { ConversionError } from '../lib/stream-helpers.js';
import { extractPdfText } from '../lib/pdf-text.js';
import { makeTestPdf } from './helpers.mjs';

describe('comparePDFs', () => {
  test('produces a valid, openable PDF report', async () => {
    const a = await makeTestPdf([['The quick brown fox', 'jumps over the lazy dog']]);
    const b = await makeTestPdf([['The quick brown fox', 'leaps over the lazy dog']]);
    const report = await comparePDFs(a, b, { nameA: 'a.pdf', nameB: 'b.pdf' });
    const doc = await PDFDocument.load(report);
    assert.ok(doc.getPageCount() >= 1);
  });

  test('report text reflects the actual differences (not the wrong "merge" behavior)', async () => {
    const a = await makeTestPdf([['Identical line', 'Only in A']]);
    const b = await makeTestPdf([['Identical line', 'Only in B']]);
    const report = await comparePDFs(a, b, { nameA: 'a.pdf', nameB: 'b.pdf' });
    const { text } = await extractPdfText(report);
    assert.match(text, /Only in A/);
    assert.match(text, /Only in B/);
    // The report should be a diff summary, not the literal merged source pages.
    assert.match(text, /Comparison Report/);
  });

  test('reports 100% similarity for identical documents', async () => {
    const a = await makeTestPdf([['Same content here']]);
    const b = await makeTestPdf([['Same content here']]);
    const report = await comparePDFs(a, b, { nameA: 'a.pdf', nameB: 'b.pdf' });
    const { text } = await extractPdfText(report);
    assert.match(text, /100%/);
    assert.match(text, /No textual differences/);
  });

  test('does not throw when documents contain non-Latin1 text', async () => {
    const a = await makeTestPdf([['Hello world']]);
    const b = await makeTestPdf([['Hello world changed']]);
    // Filenames can also contain arbitrary user-supplied text.
    await assert.doesNotReject(() => comparePDFs(a, b, { nameA: '机密.pdf', nameB: 'b★.pdf' }));
  });

  test('rejects when neither PDF has extractable text', async () => {
    const blank = await makeTestPdf([[]]);
    await assert.rejects(() => comparePDFs(blank, blank, {}), ConversionError);
  });
});
