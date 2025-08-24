// Utility to export array of objects as CSV
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return;
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(','));
  for (const row of data) {
    const values = headers.map(h => {
      let val = row[h] ?? '';
      if (typeof val === 'string') val = '"' + val.replace(/"/g, '""') + '"';
      return val;
    });
    csvRows.push(values.join(','));
  }
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
