import ConverterPage from '../../components/ConverterPage';

export const metadata = {
  title: 'Word to PDF',
  description: 'Convert Word (.docx) documents to PDF with perfect layout fidelity — margins, tables, fonts, and images preserved pixel-perfectly.',
};

function DocxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13l1.5 4 1.5-4 1.5 4 1.5-4" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 12h3a1 1 0 0 1 0 2H8v-2zM8 14v2" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const config = {
  title: 'Word to PDF',
  subtitle: 'Upload a .docx file and receive a pixel-perfect PDF. Every margin, table, embedded image, and font weight faithfully reproduced.',
  apiEndpoint: '/api/convert/word-to-pdf',
  acceptMime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','application/docx','application/octet-stream','application/zip'],
  acceptExt: ['docx'],
  outputExt: 'pdf',
  inputLabel: 'DOCX',
  outputLabel: 'PDF',
  inputIcon: <DocxIcon />,
  outputIcon: <PdfIcon />,
  featureBullets: [
    'Exact page margins and section breaks preserved',
    'Complex tables with merged cells and borders intact',
    'Embedded images, charts, and SmartArt retained',
    'Explicit font weights, styles, and sizes maintained',
    'Text wrapping around floated objects reproduced',
    'Headers, footers, and page numbers included',
    'Hyperlinks remain clickable in the output PDF',
    'Supports password-protected editing restrictions',
  ],
};

export default function WordToPdfPage() {
  return <ConverterPage config={config} />;
}
