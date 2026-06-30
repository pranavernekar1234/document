'use client';
import ToolPage from '../../../components/ToolPage';
import { Wrench, Check } from 'lucide-react';

const TOOL = {
  id: 'repair-pdf',
  name: 'Repair PDF',
  description: 'Fix corrupted or damaged PDF files and recover lost content.',
  endpoint: '/api/pdf/repair',
  category: 'Optimize PDF',
  accent: '#8B5CF6',
  icon: <Wrench size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "repair-pdf.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Fixes broken structure", "Recovers readable content", "Repairs metadata", "Works on most damage types"];





export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      
    />
  );
}
