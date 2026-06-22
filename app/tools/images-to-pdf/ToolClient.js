'use client';
import ToolPage from '../../../components/ToolPage';
import { Image as ImageIcon, Check } from 'lucide-react';

const TOOL = {
  id: 'images-to-pdf',
  name: 'JPG to PDF',
  description: 'Convert JPG, PNG, or WebP images into a PDF document instantly.',
  endpoint: '/api/pdf/images-to-pdf',
  category: 'Convert to PDF',
  accent: '#06B6D4',
  icon: <ImageIcon size={22} />,
  acceptExt: ["jpg", "jpeg", "png", "webp"],
  multiple: true,
  maxFiles: 20,
  outputName: "images.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Multiple image formats supported", "Each image becomes one page", "Original resolution preserved", "Upload order determines page order"];


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
