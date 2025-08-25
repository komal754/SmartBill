import { useState } from 'react';

export default function UploadReceipt() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  function handleFileChange(e) {
    const selected = e.target.files[0];
    setFile(selected);
    if (selected && selected.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setUploadError("");
    setUploadSuccess("");
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/upload-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
      } else {
        setUploadSuccess('Receipt uploaded successfully!');
        setFile(null);
        setPreview(null);
      }
    } catch (err) {
      setUploadError('Network error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center">Upload Receipt</h1>
      <form onSubmit={handleUpload} className="bg-white shadow rounded-lg p-6 flex flex-col gap-4">
        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
        {preview && (
          <img src={preview} alt="Preview" className="max-h-48 rounded border mx-auto" />
        )}
        {file && !preview && (
          <div className="text-gray-500">PDF selected: {file.name}</div>
        )}
        {uploadError && <div className="text-red-600 text-center">{uploadError}</div>}
        {uploadSuccess && <div className="text-green-600 text-center">{uploadSuccess}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
