'use client';
import ToolPage from '../../../components/ToolPage';
import { Image as ImageIcon, Check } from 'lucide-react';

const TOOL = {
  id: 'pdf-to-jpg',
  name: 'PDF to JPG',
  description: 'Convert PDF pages to high-quality JPG images — one image per page.',
  endpoint: '/api/pdf/pdf-to-jpg',
  category: 'Convert from PDF',
  accent: '#A78BFA',
  icon: <ImageIcon size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: undefined,
  outputMime: undefined,
  multipleOutputs: true,
};

const BULLETS = ["Each page becomes a separate JPG", "High resolution output", "Download all images at once", "Transparent backgrounds converted to white"];


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
