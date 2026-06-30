export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import Busboy from 'busboy';
import { rotatePDF } from '../../../../lib/pdf-processor.js';
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
    const pages = fields.pages ? JSON.parse(fields.pages) : [];
    const angle = parseInt(fields.angle ?? '90', 10);
    if (![90,180,270].includes(angle)) throw new ConversionError(400,'Angle must be 90, 180, or 270.');
    const result = await rotatePDF(buf, pages, angle);
    return buildFileResponse(result,'application/pdf','rotated.pdf');
  } catch(err) { return buildErrorResponse(err,'rotate'); }
}
