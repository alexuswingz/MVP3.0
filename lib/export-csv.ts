/**
 * Export table data as CSV with filename [pagename]_export_[YYYY-MM-DD].csv
 */

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value).trim();
  if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(',')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  getValue?: (row: T) => unknown;
}

/**
 * Build CSV content from columns and rows. Uses column.key to read row[key] unless getValue is provided.
 */
export function buildCsvContent<T extends Record<string, unknown>>(
  columns: CsvColumn<T>[],
  rows: T[]
): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.getValue ? col.getValue(row) : row[col.key];
        return escapeCsvValue(value);
      })
      .join(',')
  );
  return [header, ...lines].join('\r\n');
}

/**
 * Trigger download of a CSV file.
 * @param pageName - Used in filename: [pageName]_export_[YYYY-MM-DD].csv
 */
export function downloadTableAsCsv<T extends Record<string, unknown>>(options: {
  pageName: string;
  columns: CsvColumn<T>[];
  rows: T[];
}): void {
  const { pageName, columns, rows } = options;
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const filename = `${pageName}_export_${y}-${m}-${d}.csv`;
  const content = buildCsvContent(columns, rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
