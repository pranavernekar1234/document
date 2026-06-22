'use client';
import ToolPage from '../../../components/ToolPage';
import { Merge, Check } from 'lucide-react';

const TOOL = {
  id: 'merge-pdf',
  name: 'Merge PDF',
  description: 'Combine multiple PDF files into one document in seconds.',
  endpoint: '/api/pdf/merge',
  category: 'Organize PDF',
  accent: '#3B82F6',
  icon: <Merge size={22} />,
  acceptExt: ["pdf"],
  multiple: true,
  maxFiles: 20,
  outputName: "merged.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Combine up to 20 PDF files at once", "Files merged in the order you upload them", "All pages, fonts, and images preserved", "No file size restrictions per file", "Download as a single merged PDF"];


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
