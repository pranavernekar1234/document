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
    // PDF/A via ConvertAPI pdfa endpoint
    const secret=process.env.CONVERTAPI_SECRET;
    if(!secret) throw new ConversionError(500,'CONVERTAPI_SECRET not set.');
    const form=new FormData();
    form.append('File',new Blob([buf],{type:'application/pdf'}),filename);
    const res=await fetch(`https://v2.convertapi.com/convert/pdf/to/pdfa?Secret=${secret}&StoreFile=true`,{method:'POST',body:form});
    if(!res.ok) throw new ConversionError(502,`ConvertAPI PDF/A failed: ${res.status}`);
    const json=await res.json();
    const url=json?.Files?.[0]?.Url;
    if(!url) throw new ConversionError(502,'No output URL.');
    const file=await fetch(url);
    const out=Buffer.from(await file.arrayBuffer());
    return buildFileResponse(out,'application/pdf',filename.replace(/\.pdf$/i,'-pdfa.pdf'));
  }catch(err){return buildErrorResponse(err,'pdf-to-pdfa');}
}
