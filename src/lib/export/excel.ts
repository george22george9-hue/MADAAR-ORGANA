// ====================================================================
// ORGANA — Arabic Excel Exporter (XLSX)
// Developed by MADAAR Technologies
// ====================================================================

import * as XLSX from 'xlsx';

export function exportToExcel(
  filename: string,
  sheetName: string,
  data: Record<string, any>[],
  headers: { key: string; label: string }[]
) {
  // Format data with Arabic headers
  const formattedData = data.map((item, index) => {
    const row: Record<string, any> = { 'م': index + 1 };
    for (const h of headers) {
      row[h.label] = item[h.key] ?? '—';
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Set Right-to-Left sheet view
  ws['!views'] = [{ RTL: true }];

  // Auto-fit column widths
  const colWidths = [{ wch: 6 }];
  for (const h of headers) {
    colWidths.push({ wch: Math.max(h.label.length * 2, 16) });
  }
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

