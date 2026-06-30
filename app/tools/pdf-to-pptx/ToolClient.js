'use client';
import ToolPage from '../../../components/ToolPage';
import { Presentation, Check } from 'lucide-react';

const TOOL = {
  id: 'pdf-to-pptx',
  name: 'PDF to PowerPoint',
  description: 'Convert PDF documents to editable PowerPoint PPTX presentations.',
  endpoint: '/api/pdf/pdf-to-pptx',
  category: 'Convert from PDF',
  accent: '#A78BFA',
  icon: <Presentation size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "presentation.pptx",
  outputMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  multipleOutputs: false,
};

const BULLETS = ["Each PDF page becomes a slide", "Text remains selectable and editable", "Images extracted and placed correctly", "Compatible with PowerPoint and Google Slides"];


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
