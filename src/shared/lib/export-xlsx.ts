import * as XLSX from 'xlsx';

const MANAGUA = 'America/Managua';
const DT_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
const D_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function fmtDateTime(iso: string): string {
  return DT_FMT.format(new Date(iso));
}

export function fmtDate(iso: string): string {
  return D_FMT.format(new Date(iso));
}

export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number | null | boolean)[][];
}

export function downloadXlsx(basename: string, sheets: XlsxSheet[]): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);

    // Auto-width: set each column to fit its widest cell.
    const colWidths = sheet.headers.map((h, ci) => {
      const maxData = sheet.rows.reduce((max, row) => {
        const cell = row[ci];
        const len = cell == null ? 0 : String(cell).length;
        return Math.max(max, len);
      }, 0);
      return { wch: Math.max(h.length, maxData) + 2 };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${basename}.xlsx`);
}
