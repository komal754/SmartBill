// Utility to export array of objects as PDF (simple table)
export async function exportToPDF(data, filename = 'export.pdf') {
  if (!data || !data.length) return;
  try {
    const jsPDFModule = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDFModule.jsPDF();
    const headers = [Object.keys(data[0])];
    const rows = data.map(row => headers[0].map(h => row[h]));
    autoTable(doc, { head: headers, body: rows });
    doc.save(filename);
  } catch (err) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('PDF export failed: ' + (err.message || err));
    } else if (typeof toast !== 'undefined') {
      toast.error('PDF export failed: ' + (err.message || err));
    } else {
      alert('PDF export failed: ' + (err.message || err));
    }
  }
}
