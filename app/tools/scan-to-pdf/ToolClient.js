'use client';
import ToolPage from '../../../components/ToolPage';
import { ScanLine, Check } from 'lucide-react';

const TOOL = {
  id: 'scan-to-pdf',
  name: 'Scan to PDF',
  description: 'Convert scanned images (JPG, PNG) into a professional PDF document.',
  endpoint: '/api/pdf/scan-to-pdf',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <ScanLine size={22} />,
  acceptExt: ["jpg", "jpeg", "png", "webp"],
  multiple: true,
  maxFiles: 20,
  outputName: "scanned.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Upload up to 20 images at once", "Supports JPG, PNG, WebP formats", "Maintains original image quality", "Pages in upload order"];


const GET_FORM_DATA = (files, opts) => {
    const fd = new FormData();
    files.forEach(f => fd.append('file', f, f.name));
    return fd;
  };


export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      getFormData={GET_FORM_DATA}
    />
  );
}
