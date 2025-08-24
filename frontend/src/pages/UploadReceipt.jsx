import { useState } from 'react';

export default function UploadReceipt() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    setFile(selected);
    if (selected && selected.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    // TODO: Integrate with backend API for actual upload
    alert('File ready to upload: ' + file.name);
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={!file}>
          Upload
        </button>
      </form>
    </div>
  );
}
