'use client';
import ToolPage from '../../../components/ToolPage';
import { Presentation, Check } from 'lucide-react';

const TOOL = {
  id: 'pptx-to-pdf',
  name: 'PowerPoint to PDF',
  description: 'Convert PPT and PPTX presentations to PDF with all slides, fonts, and transitions preserved.',
  endpoint: '/api/pdf/pptx-to-pdf',
  category: 'Convert to PDF',
  accent: '#06B6D4',
  icon: <Presentation size={22} />,
  acceptExt: ["pptx", "ppt"],
  multiple: false,
  maxFiles: 1,
  outputName: "presentation.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Supports both PPT and PPTX formats", "All slides converted to pages", "Fonts and colors preserved", "Speaker notes excluded by default"];


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
