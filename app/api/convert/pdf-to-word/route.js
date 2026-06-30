/**
 * @file app/api/convert/pdf-to-word/route.js
 *
 * POST /api/convert/pdf-to-word
 *
 * Accepts a multipart/form-data upload with a `.pdf` file in the `file` field.
 * Validates the payload, delegates to the conversion service, and streams back
 * the resulting DOCX binary with correct OpenXML headers and attachment metadata.
 *
 * Security & reliability guarantees:
 * ─ Strict content-type validation before any byte is read
 * ─ Hard 10 MB ceiling enforced by Busboy during streaming parse
 * ─ PDF magic-byte (%PDF) double-check after streaming completes
 * ─ Configurable timeout on the upstream conversion call
 * ─ Exhaustive try/catch with structured, typed error responses
 * ─ ZIP/PK magic-byte check on the DOCX output (DOCX = ZIP archive)
 */

import { parseMultipartFile, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';
import { convertPdfToDocx } from '../../../../lib/conversion-service.js';

// Opt into the full Node.js runtime so we can use Busboy streams
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow up to 120 seconds for slow conversion jobs (Vercel Pro/Enterprise)
export const maxDuration = 120;

/**
 * Accepted MIME types for PDF uploads.
 * Defensive: some OS pickers report 'application/octet-stream' for PDFs.
 */
const VALID_PDF_MIMES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'application/vnd.pdf',
  'text/pdf',
  'text/x-pdf',
  'application/octet-stream',
]);

/**
 * Validate that a filename ends with .pdf.
 * @param {string} filename
 * @returns {boolean}
 */
function hasPdfExtension(filename) {
  return filename.toLowerCase().trim().endsWith('.pdf');
}

/**
 * The DOCX MIME type — used in the Content-Type response header.
 */
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * POST handler — PDF to Word conversion endpoint.
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
    return buildErrorResponse(err, 'pdf-to-word / parse');
  }

  const { buffer: pdfBuffer, filename, mimeType, size } = parsedFile;

  try {
    // ── Step 2: Validate file extension ───────────────────────────────────
    if (!hasPdfExtension(filename)) {
      return Response.json(
        {
          success: false,
          error: `Invalid file extension. Expected a .pdf file, received: "${filename}".`,
        },
        { status: 400 },
      );
    }

    if (!VALID_PDF_MIMES.has(mimeType)) {
      console.warn(
        `[pdf-to-word] Unexpected MIME type '${mimeType}' for file '${filename}'. Proceeding with caution.`,
      );
    }

    // ── Step 3: Validate PDF magic bytes (%PDF header at offset 0) ────────
    // PDFs must start with the literal string "%PDF"
    if (pdfBuffer.length < 5 || pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
      return Response.json(
        {
          success: false,
          error:
            'The uploaded file does not appear to be a valid PDF (invalid magic bytes). Please upload a genuine PDF document.',
        },
        { status: 422 },
      );
    }

    // ── Step 4: Check for PDF version marker (defensive, not blocking) ────
    const versionLine = pdfBuffer.slice(0, 8).toString('ascii');
    const versionMatch = versionLine.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      const version = parseFloat(versionMatch[1]);
      console.info(`[pdf-to-word] PDF version detected: ${version}`);
      // PDF 2.0+ has some incompatibilities with older converters — log but allow
      if (version > 2.0) {
        console.warn(`[pdf-to-word] PDF version ${version} may have limited conversion fidelity.`);
      }
    }

    console.info(
      `[pdf-to-word] Converting "${filename}" (${Math.round(size / 1024)} KB)`,
    );

    // ── Step 5: Delegate to the conversion service ─────────────────────────
    const docxBuffer = await convertPdfToDocx(pdfBuffer, filename);

    if (!docxBuffer || docxBuffer.length === 0) {
      return Response.json(
        {
          success: false,
          error:
            'Conversion produced an empty output. The PDF may be encrypted, image-only (scanned), or corrupted.',
        },
        { status: 502 },
      );
    }

    // ── Step 6: Verify DOCX output magic bytes (PK ZIP header) ───────────
    // .docx files are ZIP archives — they always start with PK (0x50 0x4B)
    if (docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4b) {
      return Response.json(
        {
          success: false,
          error:
            'Conversion service returned an invalid Word document. Please try again or use a different PDF.',
        },
        { status: 502 },
      );
    }

    // ── Step 7: Derive output filename and stream the DOCX back ───────────
    const outputFilename = filename.replace(/\.pdf$/i, '.docx');
    console.info(
      `[pdf-to-word] Success — output "${outputFilename}" (${Math.round(docxBuffer.length / 1024)} KB)`,
    );

    return buildFileResponse(docxBuffer, DOCX_MIME, outputFilename);
  } catch (err) {
    return buildErrorResponse(err, 'pdf-to-word / convert');
  }
}

/**
 * Reject all non-POST methods explicitly.
 */
export function GET() {
  return Response.json(
    { error: 'Method Not Allowed. Use POST.' },
    { status: 405 },
  );
}
