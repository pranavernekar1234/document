import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { redactPDF } from '../lib/pdf-redact.js';
import { ConversionError } from '../lib/stream-helpers.js';
import { makeTestPdf } from './helpers.mjs';

describe('redactPDF', () => {
  test('detects and redacts an email address', async () => {
    const pdf = await makeTestPdf([['Contact us at jane.doe@example.com for help']]);
    const { buffer, redactionCount } = await redactPDF(pdf);
    assert.ok(redactionCount >= 1);
    const doc = await PDFDocument.load(buffer); // must still be a valid PDF
    assert.equal(doc.getPageCount(), 1);
  });

  test('detects and redacts a Social Security Number', async () => {
    const pdf = await makeTestPdf([['SSN on file: 123-45-6789']]);
    const { redactionCount } = await redactPDF(pdf);
    assert.ok(redactionCount >= 1);
  });

  test('detects and redacts a phone number', async () => {
    const pdf = await makeTestPdf([['Call us at (555) 123-4567 anytime']]);
    const { redactionCount } = await redactPDF(pdf);
    assert.ok(redactionCount >= 1);
  });

  test('returns zero redactions for text with no detectable PII', async () => {
    const pdf = await makeTestPdf([['Nothing sensitive is written on this page at all.']]);
    const { redactionCount, buffer } = await redactPDF(pdf);
    assert.equal(redactionCount, 0);
    const doc = await PDFDocument.load(buffer); // still returns a valid PDF
    assert.equal(doc.getPageCount(), 1);
  });

  test('rejects a non-PDF buffer', async () => {
    await assert.rejects(() => redactPDF(Buffer.from('not a pdf')), ConversionError);
  });

  test('redacts multiple matches across multiple pages', async () => {
    const pdf = await makeTestPdf([
      ['Email: a@example.com'],
      ['Email: b@example.com', 'Phone: 555-987-6543'],
    ]);
    const { redactionCount } = await redactPDF(pdf);
    assert.ok(redactionCount >= 3);
  });
});
