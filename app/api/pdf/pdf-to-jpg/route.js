export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import Busboy from 'busboy';
import { ConversionError, buildErrorResponse } from '../../../../lib/stream-helpers.js';
import { convertPdfToImages } from '../../../../lib/conversion-service.js';
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
    const images = await convertPdfToImages(buf, buf.slice(0,20).toString().includes('%PDF') ? 'pdf' : 'pdf');
    return Response.json({ success:true, images, count:images.length });
  } catch(err) { return buildErrorResponse(err,'pdf-to-jpg'); }
}
