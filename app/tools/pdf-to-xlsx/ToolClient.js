'use client';
import ToolPage from '../../../components/ToolPage';
import { TableProperties, Check } from 'lucide-react';

const TOOL = {
  id: 'pdf-to-xlsx',
  name: 'PDF to Excel',
  description: 'Extract tables from PDF documents into editable Excel spreadsheets.',
  endpoint: '/api/pdf/pdf-to-xlsx',
  category: 'Convert from PDF',
  accent: '#A78BFA',
  icon: <TableProperties size={22} />,
  acceptExt: ["pdf"],
  multiple: false,
  maxFiles: 1,
  outputName: "spreadsheet.xlsx",
  outputMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  multipleOutputs: false,
};

const BULLETS = ["Tables detected automatically", "Cell structure preserved", "Multiple tables per sheet", "Compatible with Excel and Google Sheets"];


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
