'use client';
import ToolPage from '../../../components/ToolPage';
import { Eye, Check } from 'lucide-react';

const TOOL = {
  id: 'ocr-pdf',
  name: 'OCR PDF',
  description: 'Make scanned PDFs searchable with optical character recognition.',
  endpoint: '/api/pdf/ocr',
  category: 'Optimize PDF',
  accent: '#8B5CF6',
  icon: <Eye size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "ocr-pdf.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["99%+ accuracy OCR", "Multi-language support", "Searchable PDF output", "Preserves original layout"];





export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      
    />
  );
}
