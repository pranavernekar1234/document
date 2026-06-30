import ConverterPage from '../../components/ConverterPage';

export const metadata = {
  title: 'PDF to Word',
  description: 'Convert PDF documents back to editable Word (.docx) files. Layout coordinates, text blocks, tables, and images reconstructed into OpenXML format.',
};

function PdfIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="#171717" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 11h3a1.5 1.5 0 0 1 0 3H8v-3z" stroke="#171717" strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M8 14v2M12 11v5M12 11h2a1.5 1.5 0 0 1 0 3h-2" stroke="#171717" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function DocxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13l1.5 4 1.5-4 1.5 4 1.5-4" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const config = {
  title: 'PDF to Word',
  subtitle: 'Upload a PDF and get a fully editable .docx file. Text blocks, tables, and layout coordinates reconstructed into native OpenXML format.',
  apiEndpoint: '/api/convert/pdf-to-word',
  acceptMime: ['application/pdf','application/x-pdf','application/acrobat','application/vnd.pdf','text/pdf','application/octet-stream'],
  acceptExt: ['pdf'],
  outputExt: 'docx',
  inputLabel: 'PDF',
  outputLabel: 'DOCX',
  inputIcon: <PdfIcon />,
  outputIcon: <DocxIcon />,
  featureBullets: [
    'Text blocks reconstructed at exact layout coordinates',
    'Multi-column layouts detected and preserved as tables',
    'Fonts, weights, and sizes mapped to OpenXML styles',
    'Embedded images extracted and re-inserted correctly',
    'Tables detected from PDF vector geometry and rebuilt',
    'Headers and footers separated from body content',
    'Paragraph spacing and indentation faithfully reproduced',
    'Fully editable output — no locked text or rasterised content',
  ],
};

export default function PdfToWordPage() {
  return <ConverterPage config={config} />;
}
