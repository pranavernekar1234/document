'use client';
import ToolPage from '../../../components/ToolPage';
import { TableProperties, Check } from 'lucide-react';

const TOOL = {
  id: 'xlsx-to-pdf',
  name: 'Excel to PDF',
  description: 'Convert XLS and XLSX spreadsheets to PDF with tables and formatting intact.',
  endpoint: '/api/pdf/xlsx-to-pdf',
  category: 'Convert to PDF',
  accent: '#06B6D4',
  icon: <TableProperties size={22} />,
  acceptExt: ["xlsx", "xls"],
  multiple: false,
  maxFiles: 1,
  outputName: "spreadsheet.pdf",
  outputMime: "application/pdf",
  multipleOutputs: false,
};

const BULLETS = ["Supports XLS and XLSX formats", "Tables and cell borders preserved", "All sheets converted", "Formulas calculated before conversion"];


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
