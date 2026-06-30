'use client';
import ToolPage from '../../../components/ToolPage';
import { Crop, Check } from 'lucide-react';

const TOOL = {
  id: 'crop-pdf',
  name: 'Crop PDF',
  description: 'Crop the margins and visible area of your PDF pages.',
  endpoint: '/api/pdf/crop',
  category: 'Edit PDF',
  accent: '#F59E0B',
  icon: <Crop size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "crop-pdf.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Crop all pages at once", "Custom crop box", "Removes white margins", "Precise pixel control"];





export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      
    />
  );
}
