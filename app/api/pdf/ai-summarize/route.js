export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import Busboy from 'busboy';
import { ConversionError, buildErrorResponse } from '../../../../lib/stream-helpers.js';
import { extractPdfText } from '../../../../lib/pdf-text.js';

export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const buf = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': ct }, limits: { files: 1, fileSize: 50 * 1024 * 1024 } });
      let buf = null;
      bb.on('file', (_, s) => { const c = []; s.on('data', d => c.push(d)); s.on('end', () => { buf = Buffer.concat(c); }); });
      bb.on('finish', () => { if (!buf) return reject(new ConversionError(400, 'No PDF uploaded.')); resolve(buf); });
      bb.on('error', reject);
      const ab = await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });

    // Validate PDF magic bytes
    if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
      throw new ConversionError(422, 'The uploaded file is not a valid PDF.');
    }

    // Extract text via pdfjs-dist (see lib/pdf-text.js)
    const { text: rawText, pageCount: parsedPageCount } = await extractPdfText(buf, { maxPages: 50 });
    const pageCount = parsedPageCount || 1;

    if (!rawText.trim()) {
      return Response.json({
        success: true,
        summary: 'This PDF appears to be image-based or scanned. Use the OCR PDF tool first to extract text, then summarize.',
        keyPoints: ['No extractable text found in this PDF.'],
        wordCount: 0,
        pageCount,
        isScanned: true,
      });
    }

    // Clean and truncate text
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ').filter(Boolean);
    const wordCount = words.length;

    // Simple extractive summary — take first meaningful sentences
    const sentences = cleanText
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 40 && s.length < 500);

    const summaryText = sentences.slice(0, 6).join(' ');

    // Extract key points heuristically
    const keyPoints = sentences
      .filter(s => /\b(key|important|main|primary|critical|essential|note|summary|conclude|result|finding)\b/i.test(s) || s.startsWith('•') || s.startsWith('-'))
      .slice(0, 5);

    if (keyPoints.length === 0) {
      // Fallback: take evenly spaced sentences
      const step = Math.max(1, Math.floor(sentences.length / 5));
      for (let i = 0; i < sentences.length && keyPoints.length < 5; i += step) {
        keyPoints.push(sentences[i]);
      }
    }

    return Response.json({
      success: true,
      summary: summaryText || sentences.slice(0, 3).join(' ') || cleanText.slice(0, 600),
      keyPoints: keyPoints.slice(0, 5),
      wordCount,
      pageCount,
      isScanned: false,
    });
  } catch (err) {
    return buildErrorResponse(err, 'ai-summarize');
  }
}
