import React, { useState } from 'react';
import axios from 'axios';

interface BulkUploadTabProps {
  onUploadSuccess?: () => void;
}

const BulkUploadTab: React.FC<BulkUploadTabProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
    setPreview([]);
    setErrors([]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErrors([]);
    setMessage('');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await axios.post('/api/bulk-upload/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.preview || []);
      setMessage(res.data.message || 'Upload successful!');
      setErrors([]);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      setPreview(err.response?.data?.preview || []);
      setErrors(err.response?.data?.errors || ['Upload failed.']);
      setMessage('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Bulk Upload Applications</h2>
      <input
        type="file"
        accept=".txt,.csv,.xlsx"
        onChange={handleFileChange}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <div className="mt-2 text-green-600">{message}</div>}
      {errors.length > 0 && (
        <div className="mt-2 text-red-600">
          <ul>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      {preview.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Preview:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((col) => (
                    <th key={col} className="border px-2 py-1">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="border px-2 py-1">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUploadTab; 