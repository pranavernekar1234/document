export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { ConversionError, buildErrorResponse, buildFileResponse } from '../../../../lib/stream-helpers.js';

export async function POST(request) {
  try {
    let body;
    try { body = await request.json(); }
    catch { throw new ConversionError(400, 'Invalid JSON body.'); }

    const url = body?.url?.trim();
    if (!url) throw new ConversionError(400, 'A URL is required.');

    // Basic URL validation
    let parsed;
    try { parsed = new URL(url); }
    catch { throw new ConversionError(400, 'Invalid URL format. Include https:// or http://'); }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ConversionError(400, 'Only http:// and https:// URLs are supported.');
    }

    const secret = process.env.CONVERTAPI_SECRET;
    if (!secret) {
      throw new ConversionError(500, 'ConvertAPI is not configured. Set CONVERTAPI_SECRET in .env.local.');
    }

    // Use ConvertAPI web/to/pdf for URL conversion
    const params = new URLSearchParams({
      Secret: secret,
      Url: url,
      StoreFile: 'true',
      PageSize: 'A4',
      MarginTop: '10',
      MarginBottom: '10',
      MarginLeft: '10',
      MarginRight: '10',
    });

    const res = await fetch(
      `https://v2.convertapi.com/convert/web/to/pdf?${params}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ConversionError(502, `URL conversion failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const fileUrl = json?.Files?.[0]?.Url;
    if (!fileUrl) throw new ConversionError(502, 'ConvertAPI did not return a file URL.');

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok || !fileRes.body) throw new ConversionError(502, 'Failed to download converted PDF.');

    const chunks = [];
    const reader = fileRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    const result = Buffer.concat(chunks);

    // Derive a clean filename from the URL
    const hostname = parsed.hostname.replace(/^www\./, '');
    return buildFileResponse(result, 'application/pdf', `${hostname}.pdf`);
  } catch (err) {
    return buildErrorResponse(err, 'url-to-pdf');
  }
}
