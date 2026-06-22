import ToolClient from './ToolClient';

export const metadata = { title: 'PDF to Excel', description: 'Extract tables from PDF documents into editable Excel spreadsheets.' };

export default function Page() {
  return <ToolClient />;
}
