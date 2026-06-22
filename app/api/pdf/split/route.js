export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import Busboy from 'busboy';
import { splitPDF } from '../../../../lib/pdf-processor.js';
import { buildErrorResponse, ConversionError } from '../../../../lib/stream-helpers.js';
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
    const ranges = fields.ranges ? JSON.parse(fields.ranges) : [];
    const results = await splitPDF(buf, ranges);
    const parts = results.map(r=>({ label:r.label, data:r.buffer.toString('base64'), size:r.buffer.length }));
    return Response.json({ success:true, parts, count:parts.length });
  } catch(err) { return buildErrorResponse(err,'split'); }
}
