import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConversionError, buildErrorResponse, buildFileResponse,
  assertContentType, collectStream,
} from '../lib/stream-helpers.js';

describe('ConversionError', () => {
  test('carries a status code and message', () => {
    const err = new ConversionError(422, 'Bad input');
    assert.equal(err.statusCode, 422);
    assert.equal(err.message, 'Bad input');
    assert.equal(err.name, 'ConversionError');
    assert.ok(err instanceof Error);
  });
});

describe('buildErrorResponse', () => {
  test('uses the ConversionError status code and message', async () => {
    const res = buildErrorResponse(new ConversionError(404, 'Not found'), 'test');
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Not found');
  });

  test('falls back to 500 for an unexpected plain Error', async () => {
    const res = buildErrorResponse(new Error('Boom'), 'test');
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Boom');
  });

  test('falls back to a generic message for a non-Error throw value', async () => {
    const res = buildErrorResponse('a raw string was thrown', 'test');
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'An unexpected server error occurred.');
  });
});

describe('buildFileResponse', () => {
  test('sets the correct headers for a binary file download', () => {
    const buf = Buffer.from('hello world');
    const res = buildFileResponse(buf, 'application/pdf', 'result.pdf');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/pdf');
    assert.equal(res.headers.get('Content-Length'), String(buf.length));
    assert.match(res.headers.get('Content-Disposition'), /attachment/);
    assert.match(res.headers.get('Content-Disposition'), /result\.pdf/);
  });

  test('produces a well-formed header even with spaces/parens in the filename', () => {
    const res = buildFileResponse(Buffer.from('x'), 'application/pdf', 'my file (1).pdf');
    const cd = res.headers.get('Content-Disposition');
    assert.match(cd, /^attachment; filename="[^"]*"; filename\*=UTF-8''.+$/);
  });
});

describe('assertContentType', () => {
  test('passes when the content-type matches', () => {
    assert.doesNotThrow(() => assertContentType('application/pdf; charset=utf-8', ['application/pdf']));
  });

  test('throws a ConversionError when the content-type does not match', () => {
    assert.throws(
      () => assertContentType('text/html', ['application/pdf'], 'ConvertAPI'),
      ConversionError,
    );
  });
});

describe('collectStream', () => {
  test('collects a ReadableStream into a single Buffer', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
        controller.close();
      },
    });
    const buf = await collectStream(stream);
    assert.equal(buf.toString(), 'Hello');
  });

  test('throws when the stream exceeds maxBytes', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(100));
        controller.close();
      },
    });
    await assert.rejects(() => collectStream(stream, 10), ConversionError);
  });
});
