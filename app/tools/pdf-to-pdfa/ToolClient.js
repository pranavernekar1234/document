'use client';
import ToolPage from '../../../components/ToolPage';
import { FileCheck, Check } from 'lucide-react';

const TOOL = {
  id: 'pdf-to-pdfa',
  name: 'PDF to PDF/A',
  description: 'Convert PDFs to the archival PDF/A format for long-term preservation.',
  endpoint: '/api/pdf/pdf-to-pdfa',
  category: 'Convert from PDF',
  accent: '#A78BFA',
  icon: <FileCheck size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "archive.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["ISO 19005 compliant output", "Fonts embedded in the document", "Color profiles standardized", "Ideal for legal and archival use"];


const GET_FORM_DATA = null;


export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      getFormData={GET_FORM_DATA}
    />
  );
}
