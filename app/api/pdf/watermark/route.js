export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import Busboy from 'busboy';
import { addWatermark } from '../../../../lib/pdf-processor.js';
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
    if (!fields.text?.trim()) throw new ConversionError(400,'Watermark text is required.');
    const result = await addWatermark(buf, { text: fields.text, opacity: parseFloat(fields.opacity??'0.15'), fontSize: parseInt(fields.fontSize??'60',10), rotation: parseInt(fields.rotation??'45',10) });
    return buildFileResponse(result,'application/pdf','watermarked.pdf');
  } catch(err) { return buildErrorResponse(err,'watermark'); }
}
