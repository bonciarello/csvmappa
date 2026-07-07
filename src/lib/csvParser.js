import Papa from 'papaparse';

/**
 * Parse a CSV file and return structured data.
 * @param {File} file - The CSV file
 * @returns {Promise<{headers: string[], rows: Record<string, string>[], rawRows: string[][], delimiter: string}>}
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0) {
          const fatalErrors = results.errors.filter(e => e.type !== 'FieldMismatch');
          if (fatalErrors.length > 0 && results.data.length === 0) {
            reject(new Error(fatalErrors[0].message));
            return;
          }
        }

        const headers = results.meta.fields || [];
        const rows = results.data.filter(row => {
          return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
        });

        // Also get raw rows (as arrays) for preview display
        const rawRows = rows.map(row => headers.map(h => row[h] ?? ''));

        resolve({
          headers,
          rows,
          rawRows,
          delimiter: results.meta.delimiter || ',',
        });
      },
      error: (err) => reject(new Error(err.message || 'Errore durante il parsing del CSV')),
    });
  });
}

/**
 * Convert rows using a column mapping to JSON.
 * @param {Record<string, string>[]} rows - Parsed CSV rows
 * @param {Record<string, string>} mapping - { csvColumnName: jsonKeyName }
 * @returns {object[]}
 */
export function applyMapping(rows, mapping) {
  const activeMapping = Object.entries(mapping).filter(([, jsonKey]) => jsonKey.trim() !== '');
  return rows.map(row => {
    const obj = {};
    for (const [csvCol, jsonKey] of activeMapping) {
      obj[jsonKey.trim()] = row[csvCol] ?? '';
    }
    return obj;
  });
}

/**
 * Generate a default mapping from CSV headers to JSON keys.
 * Sanitizes column names to valid JSON keys.
 * @param {string[]} headers
 * @returns {Record<string, string>}
 */
export function generateDefaultMapping(headers) {
  const mapping = {};
  for (const h of headers) {
    mapping[h] = sanitizeKey(h);
  }
  return mapping;
}

/**
 * Sanitize a string to be a valid, readable JSON key.
 * Converts to lowercase, replaces spaces/accents with underscores, removes special chars.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeKey(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_')
    || 'campo';
}
