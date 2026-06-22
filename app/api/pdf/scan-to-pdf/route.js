export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
import Busboy from 'busboy';
import{imagesToPDF}from'../../../../lib/pdf-processor.js';
import{buildErrorResponse,buildFileResponse,ConversionError}from'../../../../lib/stream-helpers.js';
export async function POST(request){
  const ct=request.headers.get('content-type')??'';
  try{
    const images=await new Promise(async(resolve,reject)=>{
      const bb=Busboy({headers:{'content-type':ct},limits:{files:20,fileSize:20*1024*1024}});
      const imgs=[];
      bb.on('file',(_,s,info)=>{const c=[];s.on('data',d=>c.push(d));s.on('end',()=>{imgs.push({buffer:Buffer.concat(c),mimeType:info.mimeType});});});
      bb.on('finish',()=>{if(!imgs.length)return reject(new ConversionError(400,'No images uploaded.'));resolve(imgs);});
      bb.on('error',reject);const ab=await request.arrayBuffer();bb.write(Buffer.from(ab));bb.end();
    });
    const result=await imagesToPDF(images);
    return buildFileResponse(result,'application/pdf','scanned.pdf');
  }catch(err){return buildErrorResponse(err,'scan-to-pdf');}
}
