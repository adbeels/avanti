/**
 * Mini-parser CSV sin dependencias externas.
 * Soporta:
 *   - Strings entrecomillados con comas dentro
 *   - Escape de comillas con doble comilla ("")
 *   - CRLF y LF
 *   - Líneas vacías (las descarta)
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  // Quitar BOM si existe
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      // Escape: "" → "
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current !== '' || row.length > 0) {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      }
      if (char === '\r' && next === '\n') i++;
    } else {
      current += char;
    }
  }

  if (current !== '' || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  // Filtrar filas completamente vacías
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Convierte el array de filas a objetos usando la primera fila como header.
 * Normaliza headers: trim + lowercase + reemplaza espacios por underscore.
 */
export function csvToObjects<T = Record<string, string>>(rows: string[][]): T[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? '').trim();
    });
    return obj as T;
  });
}

/**
 * Helper inverso: array de objetos → CSV string.
 */
export function objectsToCSV(headers: string[], rows: Record<string, string | number | undefined>[]): string {
  const escape = (v: string | number | undefined): string => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((r) => headers.map((h) => escape(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n') + '\n';
}

/**
 * Dispara descarga de un string como archivo.
 */
export function downloadCSV(filename: string, content: string): void {
  const BOM = '﻿'; // para que Excel detecte UTF-8
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
