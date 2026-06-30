'use client';
import ToolPage from '../../../components/ToolPage';
import { PenTool, Settings } from 'lucide-react';

const TOOL = {
  id: 'sign-pdf',
  name: 'Sign PDF',
  description: 'Add a digital signature stamp to your PDF documents.',
  endpoint: '/api/pdf/sign',
  category: 'PDF Security',
  accent: '#22C55E',
  icon: <PenTool size={22} />,
  acceptExt: ['pdf'],
  multiple: false,
  maxFiles: 1,
  outputName: 'signed.pdf',
  outputMime: 'application/pdf',
  multipleOutputs: false,
};

const BULLETS = [
  'Type your name to generate a signature',
  'Signature stamped on the last page',
  'Timestamp included automatically',
  'No password needed for unencrypted PDFs',
];

const OPTIONS = ({ values, setOpt }) => (
  <div>
    <label className="text-black/45 text-xs font-medium block mb-1.5 flex items-center gap-2">
      <Settings size={12} /> Your Name (signature)
    </label>
    <input
      type="text"
      placeholder="e.g. John Smith"
      value={values.signerName || ''}
      onChange={(e) => setOpt('signerName', e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/10"
      style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }}
    />
    <p className="text-black/35 text-xs mt-1.5">This name will appear in the signature stamp.</p>
  </div>
);

const GET_FORM_DATA = (files, opts) => {
  const fd = new FormData();
  fd.append('file', files[0], files[0].name);
  fd.append('signerName', opts.signerName || 'Signed');
  return fd;
};

export const metadata_unused = null;

export default function ToolClient() {
  return (
    <ToolPage
      tool={TOOL}
      featureBullets={BULLETS}
      options={OPTIONS}
      getFormData={GET_FORM_DATA}
    />
  );
}
