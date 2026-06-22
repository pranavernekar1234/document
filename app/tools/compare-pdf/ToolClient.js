'use client';
import ToolPage from '../../../components/ToolPage';
import { GitCompare, Check } from 'lucide-react';

const TOOL = {
  id: 'compare-pdf',
  name: 'Compare PDF',
  description: 'Detect differences between two PDF versions visually and by text.',
  endpoint: '/api/pdf/compare',
  category: 'PDF Security',
  accent: '#22C55E',
  icon: <GitCompare size={22} />,
  acceptExt: ["pdf"],
  multiple: true,
  maxFiles: 2,
  outputName: "compare-pdf.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Visual difference highlighting", "Text change detection", "Side-by-side comparison", "Export comparison report"];





export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      
    />
  );
}
