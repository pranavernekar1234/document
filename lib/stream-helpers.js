/**
 * @file stream-helpers.js
 * Server-side Node.js stream utilities for safe binary file handling.
 * All helpers are designed to be used inside Next.js App Router API routes.
 */

import Busboy from 'busboy';

/**
 * @typedef {Object} ParsedFile
 * @property {Buffer} buffer       - The complete file contents as a Buffer.
 * @property {string} filename     - The original filename from the multipart field.
 * @property {string} mimeType     - The declared MIME type from the multipart header.
 * @property {string} encoding     - The transfer encoding reported by the client.
 * @property {number} size         - The byte length of the buffer.
 */

/**
 * Parse the first file from a multipart/form-data request using Busboy.
 * Accumulates chunks in memory for files ≤ 10 MB; rejects anything larger.
 *
 * @param {Request} request - The incoming Next.js App Router Request.
 * @param {object}  [opts]
 * @param {number}  [opts.maxFileSizeMb=10] - Hard limit in megabytes.
 * @param {string}  [opts.fieldName='file'] - Expected multipart field name.
 * @returns {Promise<ParsedFile>}
 */
export async function parseMultipartFile(request, opts = {}) {
  const { maxFileSizeMb = 10, fieldName = 'file' } = opts;
  const maxBytes = maxFileSizeMb * 1024 * 1024;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new ConversionError(
      400,
      `Expected multipart/form-data but received: ${contentType || '(none)'}`,
    );
  }

  return new Promise(async (resolve, reject) => {
    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { files: 1, fileSize: maxBytes },
    });

    let resolved = false;

    busboy.on('file', (name, stream, info) => {
      // Only process the target field; drain others
      if (name !== fieldName) {
        stream.resume();
        return;
      }

      const { filename, mimeType, encoding } = info;
      /** @type {Buffer[]} */
      const chunks = [];
      let totalBytes = 0;

      stream.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          stream.destroy();
          if (!resolved) {
            resolved = true;
            reject(
              new ConversionError(
                413,
                `File exceeds the maximum allowed size of ${maxFileSizeMb} MB.`,
              ),
            );
          }
          return;
        }
        chunks.push(chunk);
      });

      stream.on('limit', () => {
        if (!resolved) {
          resolved = true;
          reject(
            new ConversionError(
              413,
              `File exceeds the maximum allowed size of ${maxFileSizeMb} MB.`,
            ),
          );
        }
      });

      stream.on('end', () => {
        if (resolved) return;
        if (chunks.length === 0) {
          resolved = true;
          reject(new ConversionError(400, 'Uploaded file is empty.'));
          return;
        }
        resolved = true;
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          filename: filename ?? 'upload',
          mimeType: mimeType ?? 'application/octet-stream',
          encoding: encoding ?? '7bit',
          size: buffer.length,
        });
      });

      stream.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(new ConversionError(500, `File stream error: ${err.message}`));
        }
      });
    });

    busboy.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(
          new ConversionError(500, `Multipart parsing error: ${err.message}`),
        );
      }
    });

    busboy.on('finish', () => {
      if (!resolved) {
        resolved = true;
        reject(new ConversionError(400, `No file found in field '${fieldName}'.`));
      }
    });

    // Feed the request body into busboy
    try {
      const arrayBuffer = await request.arrayBuffer();
      const nodeBuffer = Buffer.from(arrayBuffer);
      busboy.write(nodeBuffer);
      busboy.end();
    } catch (err) {
      if (!resolved) {
        resolved = true;
        reject(
          new ConversionError(
            500,
            `Failed to read request body: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }
    }
  });
}

/**
 * Structured error class for conversion pipeline failures.
 * Carries an HTTP status code alongside the human-readable message.
 */
export class ConversionError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.name = 'ConversionError';
    this.statusCode = statusCode;
  }
}

/**
 * Build a standardised JSON error Response for API routes.
 * @param {ConversionError | Error | unknown} err
 * @param {string} [context] - Optional context label for logging.
 * @returns {Response}
 */
export function buildErrorResponse(err, context = '') {
  if (err instanceof ConversionError) {
    console.error(`[ConversionError]${context ? ` (${context})` : ''}`, {
      statusCode: err.statusCode,
      message: err.message,
    });
    return Response.json(
      { success: false, error: err.message },
      { status: err.statusCode },
    );
  }

  const message =
    err instanceof Error ? err.message : 'An unexpected server error occurred.';
  console.error(`[UnhandledError]${context ? ` (${context})` : ''}`, err);
  return Response.json({ success: false, error: message }, { status: 500 });
}

/**
 * Assert that a content-type header from a conversion service response matches
 * one of the expected MIME types. Throws ConversionError on mismatch.
 *
 * @param {string | null} actualContentType
 * @param {string[]} expectedTypes
 * @param {string} [serviceName]
 */
export function assertContentType(actualContentType, expectedTypes, serviceName = 'upstream') {
  const ct = (actualContentType ?? '').toLowerCase().split(';')[0].trim();
  const matched = expectedTypes.some((t) => ct === t.toLowerCase());
  if (!matched) {
    throw new ConversionError(
      502,
      `${serviceName} returned unexpected content-type '${ct}'. Expected one of: ${expectedTypes.join(', ')}`,
    );
  }
}

/**
 * Collect a ReadableStream<Uint8Array> (e.g. from a fetch response body)
 * into a single Node.js Buffer without loading the entire payload at once.
 * Uses async iteration to process chunks as they arrive.
 *
 * @param {ReadableStream<Uint8Array>} stream
 * @param {number} [maxBytes] - Optional byte ceiling; throws on overflow.
 * @returns {Promise<Buffer>}
 */
export async function collectStream(stream, maxBytes) {
  const reader = stream.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (maxBytes !== undefined && totalBytes > maxBytes) {
          reader.cancel();
          throw new ConversionError(
            502,
            `Upstream response exceeded maximum allowed size of ${Math.round(maxBytes / 1024 / 1024)} MB.`,
          );
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/**
 * Create a Response that streams a Buffer as a binary file download.
 *
 * @param {Buffer} buffer          - Binary content to send.
 * @param {string} mimeType        - Content-Type for the response.
 * @param {string} filename        - Value for Content-Disposition attachment.
 * @returns {Response}
 */
export function buildFileResponse(buffer, mimeType, filename) {
  const safeFilename = encodeURIComponent(filename).replace(/%20/g, '+');
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
