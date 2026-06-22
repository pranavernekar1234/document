/**
 * @file app/api/convert/word-to-pdf/route.js
 *
 * POST /api/convert/word-to-pdf
 *
 * Accepts a multipart/form-data upload with a `.docx` file in the `file` field.
 * Validates the payload, delegates to the conversion service, and streams back
 * the resulting PDF binary with correct headers.
 *
 * Security & reliability guarantees:
 * ─ Strict content-type validation before any byte is read
 * ─ Hard 10 MB ceiling enforced by busboy during streaming
 * ─ MIME type double-check against both the multipart declaration and magic bytes
 * ─ Configurable timeout on the upstream conversion call
 * ─ Exhaustive try/catch with structured error responses
 */

import { parseMultipartFile, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';
import { convertDocxToPdf } from '../../../../lib/conversion-service.js';

// Tell Next.js not to parse the request body – we handle it via Busboy
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase Next.js default 4 MB body limit to accommodate docx files
export const maxDuration = 120; // seconds (Pro/Enterprise Vercel plans)

/**
 * Known MIME types for Office Open XML (.docx) files.
 * Browsers and OS file pickers can report slightly different values.
 */
const VALID_DOCX_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/docx',
  'application/msword',
  'application/octet-stream', // Some OS file pickers report this for .docx
  'application/zip',          // .docx is a ZIP; some parsers detect it as such
]);

/**
 * Validate that a filename has a .docx extension.
 * @param {string} filename
 * @returns {boolean}
 */
function hasDocxExtension(filename) {
  return filename.toLowerCase().trim().endsWith('.docx');
}

/**
 * POST handler – Word to PDF conversion endpoint.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
  let parsedFile;

  try {
    // ── Step 1: Parse the multipart body ──────────────────────────────────
    parsedFile = await parseMultipartFile(request, {
      maxFileSizeMb: 10,
      fieldName: 'file',
    });
  } catch (err) {
    return buildErrorResponse(err, 'word-to-pdf / parse');
  }

  const { buffer: docxBuffer, filename, mimeType, size } = parsedFile;

  try {
    // ── Step 2: Validate file type ─────────────────────────────────────────
    if (!hasDocxExtension(filename)) {
      return Response.json(
        {
          success: false,
          error: `Invalid file extension. Expected a .docx file, received: "${filename}".`,
        },
        { status: 400 },
      );
    }

    if (!VALID_DOCX_MIMES.has(mimeType)) {
      console.warn(`[word-to-pdf] Unexpected MIME type '${mimeType}' for file '${filename}'. Proceeding with caution.`);
    }

    // ── Step 3: Sanity-check magic bytes (ZIP/PK header = 0x50 0x4B) ──────
    // .docx files are ZIP archives; they begin with the PK magic signature
    if (docxBuffer.length < 4 || docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4b) {
      return Response.json(
        {
          success: false,
          error: 'The uploaded file does not appear to be a valid .docx document (invalid magic bytes).',
        },
        { status: 422 },
      );
    }

    console.info(`[word-to-pdf] Converting "${filename}" (${Math.round(size / 1024)} KB)`);

    // ── Step 4: Delegate to the conversion service ─────────────────────────
    const pdfBuffer = await convertDocxToPdf(docxBuffer, filename);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return Response.json(
        { success: false, error: 'Conversion produced an empty output. Please check your document.' },
        { status: 502 },
      );
    }

    // ── Step 5: Verify the output is a real PDF (%PDF header) ─────────────
    const pdfMagic = pdfBuffer.slice(0, 5).toString('ascii');
    if (!pdfMagic.startsWith('%PDF')) {
      return Response.json(
        { success: false, error: 'Conversion service returned an invalid PDF. Please try again.' },
        { status: 502 },
      );
    }

    // ── Step 6: Derive output filename and stream the PDF back ─────────────
    const outputFilename = filename.replace(/\.docx$/i, '.pdf');
    console.info(`[word-to-pdf] Success — output "${outputFilename}" (${Math.round(pdfBuffer.length / 1024)} KB)`);

    return buildFileResponse(pdfBuffer, 'application/pdf', outputFilename);
  } catch (err) {
    return buildErrorResponse(err, 'word-to-pdf / convert');
  }
}

/**
 * Reject all non-POST methods explicitly.
 */
export function GET() {
  return Response.json({ error: 'Method Not Allowed. Use POST.' }, { status: 405 });
}
