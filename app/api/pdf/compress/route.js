export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import Busboy from 'busboy';
import { compressPDF } from '../../../../lib/pdf-processor.js';
import { buildErrorResponse, buildFileResponse, ConversionError } from '../../../../lib/stream-helpers.js';
export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const { buf, fields } = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers:{'content-type':ct}, limits:{files:1,fileSize:50*1024*1024} });
      let buf=null; const fields={};
      bb.on('file',(_,s)=>{ const c=[]; s.on('data',d=>c.push(d)); s.on('end',()=>{buf=Buffer.concat(c);}); });
      bb.on('field',(n,v)=>{ fields[n]=v; });
      bb.on('finish',()=>{ if(!buf) return reject(new ConversionError(400,'No PDF uploaded.')); resolve({buf,fields}); });
      bb.on('error',reject);
      const ab=await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });
    const level = ['low','medium','high'].includes(fields.level) ? fields.level : 'medium';
    const originalSize = buf.length;
    const result = await compressPDF(buf, level);
    const headers = new Headers({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="compressed.pdf"', 'Content-Length':String(result.length), 'X-Original-Size':String(originalSize), 'X-Compressed-Size':String(result.length), 'Cache-Control':'no-store' });
    return new Response(result, { status:200, headers });
  } catch(err) { return buildErrorResponse(err,'compress'); }
}
