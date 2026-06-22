export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
import Busboy from 'busboy';
import{ConversionError,buildErrorResponse,buildFileResponse}from'../../../../lib/stream-helpers.js';
import{convertPdfToOffice}from'../../../../lib/conversion-service.js';
export async function POST(request){
  const ct=request.headers.get('content-type')??'';
  try{
    const{buf,filename}=await new Promise(async(resolve,reject)=>{
      const bb=Busboy({headers:{'content-type':ct},limits:{files:1,fileSize:50*1024*1024}});
      let buf=null,filename='file.pdf';
      bb.on('file',(_,s,info)=>{filename=info.filename||filename;const c=[];s.on('data',d=>c.push(d));s.on('end',()=>{buf=Buffer.concat(c);});});
      bb.on('finish',()=>{if(!buf)return reject(new ConversionError(400,'No PDF uploaded.'));resolve({buf,filename});});
      bb.on('error',reject);const ab=await request.arrayBuffer();bb.write(Buffer.from(ab));bb.end();
    });
    const result=await convertPdfToOffice(buf,'pptx',filename);
    const mime='application/vnd.openxmlformats-officedocument.presentationml.presentation';
    return buildFileResponse(result,mime,filename.replace(/\.pdf$/i,'.pptx'));
  }catch(err){return buildErrorResponse(err,'pdf-to-pptx');}
}
