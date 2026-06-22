export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { ConversionError, buildErrorResponse } from '../../../../lib/stream-helpers.js';
import { extractPdfText } from '../../../../lib/pdf-text.js';

const LANGUAGE_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
  ru: 'Russian', nl: 'Dutch', tr: 'Turkish', pl: 'Polish', sv: 'Swedish',
};

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const { buf, fields } = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 1, fileSize: 50 * 1024 * 1024 } });
      let buf = null; const fields = {};
      bb.on('file', (_, s) => { const c = []; s.on('data', d => c.push(d)); s.on('end', () => { buf = Buffer.concat(c); }); });
      bb.on('field', (n, v) => { fields[n] = v; });
      bb.on('finish', () => { if (!buf) return reject(new ConversionError(400, 'No PDF uploaded.')); resolve({ buf, fields }); });
      bb.on('error', reject);
      const ab = await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });

    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new ConversionError(422, 'Not a valid PDF file.');
    }

    const targetLang = fields.targetLang || 'es';
    const langName = LANGUAGE_NAMES[targetLang] || targetLang;

    // Extract text first (via safe wrapper — see lib/pdf-text.js)
    const { text: extractedText, pageCount } = await extractPdfText(buf, { maxPages: 30 });
    const sourceText = (extractedText ?? '').replace(/\s+/g, ' ').trim();

    if (!sourceText) {
      return Response.json({
        success: true,
        translatedText: '',
        sourceLength: 0,
        isScanned: true,
        targetLang,
        targetLangName: langName,
      });
    }

    // Use a free translation API (MyMemory) for a real translation, chunked
    const MAX_CHARS = 480; // MyMemory free tier limit per request
    const chunks = [];
    for (let i = 0; i < sourceText.length && chunks.length < 6; i += MAX_CHARS) {
      chunks.push(sourceText.slice(i, i + MAX_CHARS));
    }

    const translatedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`;
          const res = await fetch(url);
          if (!res.ok) return chunk;
          const json = await res.json();
          const translated = json?.responseData?.translatedText;
          const status = json?.responseStatus ?? json?.responseData?.responseStatus;
          // MyMemory returns 200 with a warning string embedded in translatedText
          // when the free-tier quota is exhausted — don't surface that as a translation.
          if (!translated || (status && Number(status) !== 200) || /MYMEMORY WARNING/i.test(translated)) {
            return chunk;
          }
          return translated;
        } catch {
          return chunk;
        }
      })
    );

    const translatedText = translatedChunks.join(' ');

    return Response.json({
      success: true,
      translatedText,
      originalPreview: sourceText.slice(0, 600),
      sourceLength: sourceText.length,
      isScanned: false,
      targetLang,
      targetLangName: langName,
      pageCount,
      truncated: sourceText.length > chunks.length * MAX_CHARS,
    });
  } catch (err) {
    return buildErrorResponse(err, 'translate');
  }
}
