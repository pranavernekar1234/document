/**
 * @file conversion-service.js
 *
 * Abstraction layer that wraps the high-fidelity document conversion pipeline.
 *
 * Architecture rationale:
 * ─────────────────────────────────────────────────────────────────────────────
 * Standard serverless runtimes (Vercel, Netlify, AWS Lambda) impose strict
 * binary size limits (50 MB zipped) that prevent bundling LibreOffice or
 * Ghostscript directly. Instead, this service orchestrates calls to a
 * dedicated conversion micro-service that can run full LibreOffice/Pandoc
 * stacks on a container or VM.
 *
 * Two providers are supported out-of-the-box:
 *   1. ConvertAPI  – https://www.convertapi.com  (recommended for production)
 *   2. CloudConvert – https://cloudconvert.com   (alternative)
 *
 * For local development / self-hosting, set CONVERSION_PROVIDER=local and
 * point CONVERSION_ENDPOINT to your own LibreOffice REST service (e.g. a
 * Docker container running gotenberg/gotenberg).
 *
 * Environment variables:
 *   CONVERSION_PROVIDER   = 'convertapi' | 'cloudconvert' | 'local'  (default: 'convertapi')
 *   CONVERTAPI_SECRET     = <your ConvertAPI secret key>
 *   CLOUDCONVERT_API_KEY  = <your CloudConvert API key>
 *   CONVERSION_ENDPOINT   = <URL for 'local' provider>
 *   CONVERSION_TIMEOUT_MS = request timeout in milliseconds (default: 120000)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConversionError, assertContentType, collectStream } from './stream-helpers.js';

const PROVIDER = process.env.CONVERSION_PROVIDER ?? 'convertapi';
const TIMEOUT_MS = parseInt(process.env.CONVERSION_TIMEOUT_MS ?? '120000', 10);

// ─── ConvertAPI Provider ─────────────────────────────────────────────────────

/**
 * Convert a DOCX buffer → PDF via ConvertAPI.
 * @param {Buffer} docxBuffer
 * @param {string} originalFilename
 * @returns {Promise<Buffer>}
 */
async function convertapiDocxToPdf(docxBuffer, originalFilename) {
  const secret = process.env.CONVERTAPI_SECRET;
  if (!secret) {
    throw new ConversionError(
      500,
      'CONVERTAPI_SECRET environment variable is not set. Please configure your ConvertAPI credentials.',
    );
  }

  const formData = new FormData();
  const blob = new Blob([docxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  formData.append('File', blob, originalFilename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(
      `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${secret}&StoreFile=true`,
      { method: 'POST', body: formData, signal: controller.signal },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ConversionError(504, `Conversion timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw new ConversionError(502, `ConvertAPI request failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ConversionError(
      502,
      `ConvertAPI returned HTTP ${response.status}: ${body.slice(0, 256)}`,
    );
  }

  const json = /** @type {any} */ (await response.json());
  const fileUrl = json?.Files?.[0]?.Url;
  if (typeof fileUrl !== 'string') {
    throw new ConversionError(502, 'ConvertAPI response did not include a file URL.');
  }

  // Fetch the converted file from the temporary storage URL
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok || !fileResponse.body) {
    throw new ConversionError(502, `Failed to download converted PDF from ConvertAPI storage.`);
  }
  assertContentType(fileResponse.headers.get('content-type'), ['application/pdf'], 'ConvertAPI');
  return collectStream(fileResponse.body, 50 * 1024 * 1024);
}

/**
 * Convert a PDF buffer → DOCX via ConvertAPI.
 * @param {Buffer} pdfBuffer
 * @param {string} originalFilename
 * @returns {Promise<Buffer>}
 */
async function convertapiPdfToDocx(pdfBuffer, originalFilename) {
  const secret = process.env.CONVERTAPI_SECRET;
  if (!secret) {
    throw new ConversionError(
      500,
      'CONVERTAPI_SECRET environment variable is not set. Please configure your ConvertAPI credentials.',
    );
  }

  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData.append('File', blob, originalFilename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(
      `https://v2.convertapi.com/convert/pdf/to/docx?Secret=${secret}&StoreFile=true`,
      { method: 'POST', body: formData, signal: controller.signal },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ConversionError(504, `Conversion timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw new ConversionError(502, `ConvertAPI request failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ConversionError(
      502,
      `ConvertAPI returned HTTP ${response.status}: ${body.slice(0, 256)}`,
    );
  }

  const json = /** @type {any} */ (await response.json());
  const fileUrl = json?.Files?.[0]?.Url;
  if (typeof fileUrl !== 'string') {
    throw new ConversionError(502, 'ConvertAPI response did not include a file URL.');
  }

  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok || !fileResponse.body) {
    throw new ConversionError(502, `Failed to download converted DOCX from ConvertAPI storage.`);
  }
  assertContentType(
    fileResponse.headers.get('content-type'),
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ],
    'ConvertAPI',
  );
  return collectStream(fileResponse.body, 50 * 1024 * 1024);
}

// ─── CloudConvert Provider ───────────────────────────────────────────────────

/**
 * Generic CloudConvert conversion helper.
 * Creates a job, uploads the file, waits for completion, and downloads the result.
 *
 * @param {Buffer} inputBuffer
 * @param {string} originalFilename
 * @param {string} inputFormat  - e.g. 'docx'
 * @param {string} outputFormat - e.g. 'pdf'
 * @returns {Promise<Buffer>}
 */
async function cloudconvertConvert(inputBuffer, originalFilename, inputFormat, outputFormat) {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    throw new ConversionError(
      500,
      'CLOUDCONVERT_API_KEY environment variable is not set.',
    );
  }

  const baseHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Step 1: Create a conversion job
  const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({
      tasks: {
        'upload-file': { operation: 'import/upload' },
        'convert-file': {
          operation: 'convert',
          input: 'upload-file',
          input_format: inputFormat,
          output_format: outputFormat,
          engine: 'libreoffice',
          // Preserve all layout fidelity settings
          ...(outputFormat === 'pdf'
            ? { pdf_profile: 'PDF/A-2b', optimize_print_pdf: false }
            : {}),
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file',
        },
      },
    }),
  });

  if (!jobRes.ok) {
    const body = await jobRes.text().catch(() => '');
    throw new ConversionError(502, `CloudConvert job creation failed: ${body.slice(0, 256)}`);
  }

  const job = /** @type {any} */ (await jobRes.json());
  const uploadTask = job.data?.tasks?.find((t) => t.name === 'upload-file');
  if (!uploadTask?.result?.form) {
    throw new ConversionError(502, 'CloudConvert did not return an upload form.');
  }

  // Step 2: Upload the file to CloudConvert's S3 presigned URL
  const { url: uploadUrl, parameters } = uploadTask.result.form;
  const uploadForm = new FormData();
  for (const [key, value] of Object.entries(parameters)) {
    uploadForm.append(key, String(value));
  }
  uploadForm.append('file', new Blob([inputBuffer]), originalFilename);

  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
  if (!uploadRes.ok) {
    throw new ConversionError(502, `CloudConvert file upload failed: HTTP ${uploadRes.status}`);
  }

  // Step 3: Wait for the job to finish (poll with exponential backoff)
  const jobId = job.data.id;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, Math.min(2000 * Math.pow(1.4, attempts), 15000)));
    attempts++;

    const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!statusRes.ok) continue;

    const statusData = /** @type {any} */ (await statusRes.json());
    const status = statusData.data?.status;

    if (status === 'error') {
      const errMsg = statusData.data?.tasks?.find((t) => t.status === 'error')?.message ?? 'Unknown error';
      throw new ConversionError(502, `CloudConvert conversion failed: ${errMsg}`);
    }

    if (status === 'finished') {
      const exportTask = statusData.data?.tasks?.find((t) => t.name === 'export-file');
      const fileUrl = exportTask?.result?.files?.[0]?.url;
      if (typeof fileUrl !== 'string') {
        throw new ConversionError(502, 'CloudConvert finished but no output file URL was found.');
      }

      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok || !fileRes.body) {
        throw new ConversionError(502, 'Failed to download the converted file from CloudConvert.');
      }
      return collectStream(fileRes.body, 50 * 1024 * 1024);
    }
  }

  throw new ConversionError(504, `CloudConvert job did not finish within the allowed time.`);
}

// ─── Local / Gotenberg Provider ─────────────────────────────────────────────

/**
 * Convert using a locally-hosted Gotenberg instance.
 * @see https://gotenberg.dev
 *
 * @param {Buffer} inputBuffer
 * @param {string} originalFilename
 * @param {'docx-to-pdf' | 'pdf-to-docx'} direction
 * @returns {Promise<Buffer>}
 */
async function localConvert(inputBuffer, originalFilename, direction) {
  const endpoint = process.env.CONVERSION_ENDPOINT;
  if (!endpoint) {
    throw new ConversionError(
      500,
      'CONVERSION_ENDPOINT must be set when using the local provider.',
    );
  }

  let apiPath;
  let outputMime;
  if (direction === 'docx-to-pdf') {
    apiPath = '/forms/libreoffice/convert';
    outputMime = 'application/pdf';
  } else {
    // Gotenberg does not natively support PDF→DOCX; this requires a custom LibreOffice endpoint
    apiPath = '/forms/libreoffice/convert';
    outputMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  const formData = new FormData();
  formData.append('files', new Blob([inputBuffer]), originalFilename);

  if (direction === 'pdf-to-docx') {
    formData.append('nativePdfFonts', 'true');
    formData.append('landscape', 'false');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${endpoint}${apiPath}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ConversionError(504, `Local conversion timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw new ConversionError(502, `Local conversion service unreachable: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new ConversionError(502, `Local conversion failed: HTTP ${response.status} — ${body.slice(0, 256)}`);
  }

  assertContentType(response.headers.get('content-type'), [outputMime, 'application/octet-stream'], 'Local service');
  return collectStream(response.body, 50 * 1024 * 1024);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert a DOCX file buffer to a PDF buffer using the configured provider.
 *
 * @param {Buffer} docxBuffer       - Raw bytes of the source DOCX file.
 * @param {string} originalFilename - The upload's original filename.
 * @returns {Promise<Buffer>}       - Raw bytes of the converted PDF.
 */
export async function convertDocxToPdf(docxBuffer, originalFilename) {
  switch (PROVIDER) {
    case 'convertapi':
      return convertapiDocxToPdf(docxBuffer, originalFilename);
    case 'cloudconvert':
      return cloudconvertConvert(docxBuffer, originalFilename, 'docx', 'pdf');
    case 'local':
      return localConvert(docxBuffer, originalFilename, 'docx-to-pdf');
    default:
      throw new ConversionError(500, `Unknown conversion provider: '${PROVIDER}'.`);
  }
}

/**
 * Convert a PDF file buffer to a DOCX buffer using the configured provider.
 *
 * @param {Buffer} pdfBuffer        - Raw bytes of the source PDF file.
 * @param {string} originalFilename - The upload's original filename.
 * @returns {Promise<Buffer>}       - Raw bytes of the converted DOCX.
 */
export async function convertPdfToDocx(pdfBuffer, originalFilename) {
  switch (PROVIDER) {
    case 'convertapi':
      return convertapiPdfToDocx(pdfBuffer, originalFilename);
    case 'cloudconvert':
      return cloudconvertConvert(pdfBuffer, originalFilename, 'pdf', 'docx');
    case 'local':
      return localConvert(pdfBuffer, originalFilename, 'pdf-to-docx');
    default:
      throw new ConversionError(500, `Unknown conversion provider: '${PROVIDER}'.`);
  }
}

// ── New methods added for Pro Max tool suite ───────────────────────────────

/**
 * NOTE: PDF protect/unlock are implemented directly in their respective API
 * routes (app/api/pdf/protect/route.js, app/api/pdf/unlock/route.js) rather
 * than here, using ConvertAPI's documented pdf/to/protect and
 * pdf/to/unprotect endpoints.
 */

/**
 * Convert PDF pages to JPG images via ConvertAPI.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{ data: string; page: number }[]>}  base64 images
 */
export async function convertPdfToImages(pdfBuffer) {
  switch (PROVIDER) {
    case 'convertapi': {
      const secret = process.env.CONVERTAPI_SECRET;
      if (!secret) throw new ConversionError(500, 'CONVERTAPI_SECRET not set.');
      const form = new FormData();
      form.append('File', new Blob([pdfBuffer], { type: 'application/pdf' }), 'input.pdf');
      const res = await fetch(`https://v2.convertapi.com/convert/pdf/to/jpg?Secret=${secret}&StoreFile=true`, { method: 'POST', body: form });
      if (!res.ok) throw new ConversionError(502, `ConvertAPI pdf-to-jpg failed: ${res.status}`);
      const json = await res.json();
      if (!json?.Files?.length) throw new ConversionError(502, 'No images returned.');
      const images = await Promise.all(json.Files.map(async (f, i) => {
        const imgRes = await fetch(f.Url);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        return { data: buf.toString('base64'), page: i + 1, filename: f.FileName };
      }));
      return images;
    }
    case 'local':
      throw new ConversionError(501, 'PDF to JPG requires ConvertAPI provider.');
    default:
      throw new ConversionError(500, `Unknown provider: ${PROVIDER}`);
  }
}

/**
 * Convert any Office format (PPTX, XLSX, HTML) to PDF via ConvertAPI.
 * @param {Buffer} buffer
 * @param {string} fromFormat  e.g. 'pptx', 'xlsx', 'html'
 * @param {string} filename
 * @returns {Promise<Buffer>}
 */
export async function convertOfficeToPdf(buffer, fromFormat, filename) {
  switch (PROVIDER) {
    case 'convertapi': {
      const secret = process.env.CONVERTAPI_SECRET;
      if (!secret) throw new ConversionError(500, 'CONVERTAPI_SECRET not set.');
      const mimeMap = { pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation', ppt:'application/vnd.ms-powerpoint', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls:'application/vnd.ms-excel', html:'text/html' };
      const mime = mimeMap[fromFormat.toLowerCase()] ?? 'application/octet-stream';
      const form = new FormData();
      form.append('File', new Blob([buffer], { type: mime }), filename);
      const res = await fetch(`https://v2.convertapi.com/convert/${fromFormat.toLowerCase()}/to/pdf?Secret=${secret}&StoreFile=true`, { method: 'POST', body: form });
      if (!res.ok) { const t = await res.text().catch(()=>''); throw new ConversionError(502, `ConvertAPI ${fromFormat}→pdf failed: ${t.slice(0,200)}`); }
      const json = await res.json();
      const url = json?.Files?.[0]?.Url;
      if (!url) throw new ConversionError(502, 'No output URL from ConvertAPI.');
      const file = await fetch(url);
      return collectStream(file.body, 50 * 1024 * 1024);
    }
    case 'cloudconvert':
      return cloudconvertConvert(buffer, filename, fromFormat.toLowerCase(), 'pdf');
    case 'local':
      return localConvert(buffer, filename, `${fromFormat.toLowerCase()}-to-pdf`);
    default:
      throw new ConversionError(500, `Unknown provider: ${PROVIDER}`);
  }
}

/**
 * Convert PDF to Office format (pptx, xlsx) via ConvertAPI.
 * @param {Buffer} pdfBuffer
 * @param {'pptx'|'xlsx'} toFormat
 * @param {string} filename
 * @returns {Promise<Buffer>}
 */
export async function convertPdfToOffice(pdfBuffer, toFormat, filename) {
  switch (PROVIDER) {
    case 'convertapi': {
      const secret = process.env.CONVERTAPI_SECRET;
      if (!secret) throw new ConversionError(500, 'CONVERTAPI_SECRET not set.');
      const form = new FormData();
      form.append('File', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);
      const res = await fetch(`https://v2.convertapi.com/convert/pdf/to/${toFormat}?Secret=${secret}&StoreFile=true`, { method: 'POST', body: form });
      if (!res.ok) { const t = await res.text().catch(()=>''); throw new ConversionError(502, `ConvertAPI pdf→${toFormat} failed: ${t.slice(0,200)}`); }
      const json = await res.json();
      const url = json?.Files?.[0]?.Url;
      if (!url) throw new ConversionError(502, 'No output URL from ConvertAPI.');
      const file = await fetch(url);
      return collectStream(file.body, 50 * 1024 * 1024);
    }
    case 'cloudconvert':
      return cloudconvertConvert(pdfBuffer, filename, 'pdf', toFormat);
    default:
      throw new ConversionError(500, `Unknown provider: ${PROVIDER}`);
  }
}
