import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfText } from '../lib/pdf-text.js';
import { ConversionError } from '../lib/stream-helpers.js';
import { makeTestPdf } from './helpers.mjs';

describe('extractPdfText', () => {
  test('extracts text content and correct page count', async () => {
    const pdf = await makeTestPdf([['The quick brown fox'], ['Second page text']]);
    const result = await extractPdfText(pdf);
    assert.equal(result.pageCount, 2);
    assert.equal(result.pagesRead, 2);
    assert.match(result.text, /quick brown fox/);
    assert.match(result.text, /Second page text/);
  });

  test('respects maxPages and only reads the requested number of pages', async () => {
    const pdf = await makeTestPdf([['Page one'], ['Page two'], ['Page three']]);
    const result = await extractPdfText(pdf, { maxPages: 1 });
    assert.equal(result.pageCount, 3); // total pages in the doc
    assert.equal(result.pagesRead, 1); // but only 1 was actually read
    assert.match(result.text, /Page one/);
    assert.doesNotMatch(result.text, /Page two/);
  });

  test('rejects a non-PDF buffer with a clear error', async () => {
    await assert.rejects(
      () => extractPdfText(Buffer.from('this is not a pdf at all')),
      ConversionError,
    );
  });

  test('handles a PDF with no text gracefully (no throw, empty-ish text)', async () => {
    const pdf = await makeTestPdf([[]]); // page with zero lines of text
    const result = await extractPdfText(pdf);
    assert.equal(result.pageCount, 1);
    assert.equal(result.text.trim(), '');
  });
});
