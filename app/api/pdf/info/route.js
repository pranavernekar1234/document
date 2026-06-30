export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import Busboy from 'busboy';
import { getPDFInfo } from '../../../../lib/pdf-processor.js';
import { buildErrorResponse, ConversionError } from '../../../../lib/stream-helpers.js';
export async function POST(request) {
  const ct = request.headers.get('content-type') ?? '';
  try {
    const buf = await new Promise(async (resolve, reject) => {
      const bb = Busboy({ headers:{'content-type':ct}, limits:{files:1,fileSize:50*1024*1024} });
      let buf=null;
      bb.on('file',(_,s)=>{ const c=[]; s.on('data',d=>c.push(d)); s.on('end',()=>{buf=Buffer.concat(c);}); });
      bb.on('finish',()=>{ if(!buf) return reject(new ConversionError(400,'No PDF uploaded.')); resolve(buf); });
      bb.on('error',reject);
      const ab=await request.arrayBuffer(); bb.write(Buffer.from(ab)); bb.end();
    });
    const info = await getPDFInfo(buf);
    return Response.json({ success:true, ...info });
  } catch(err) { return buildErrorResponse(err,'info'); }
}
