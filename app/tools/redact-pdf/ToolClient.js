'use client';
import ToolPage from '../../../components/ToolPage';
import { EyeOff, Check } from 'lucide-react';

const TOOL = {
  id: 'redact-pdf',
  name: 'Redact PDF',
  description: 'Permanently remove sensitive information from your PDF.',
  endpoint: '/api/pdf/redact',
  category: 'PDF Security',
  accent: '#22C55E',
  icon: <EyeOff size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "redact-pdf.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Permanent redaction", "Text and image removal", "No recovery possible", "Audit trail included"];





export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      
      
    />
  );
}
