import React, { useState, useRef } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface BulkUploadTabProps {
  onUploadSuccess?: () => void;
}

const REQUIRED_COLUMNS = ['Application Name', 'Vendor', 'Product', 'Version', 'Status'];

const BulkUploadTab: React.FC<BulkUploadTabProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showAllPreview, setShowAllPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: parse file columns (headers) for mapping UI
  const parseFileColumns = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        let headers: string[] = [];
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const firstLine = text.split(/\r?\n/)[0];
          headers = firstLine.split(file.name.endsWith('.csv') ? ',' : '\t').map(h => h.trim());
        } else if (file.name.endsWith('.xlsx')) {
          headers = [];
        }
        resolve(headers);
      };
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setPreview([]);
    setErrors([]);
    setMessage('');
    setShowMappingUI(false);
    setErrorReport(null);
    setColumnMapping({});
    setFileColumns([]);
    setShowAllPreview(false);
    if (file) {
      const headers = await parseFileColumns(file);
      setFileColumns(headers);
    }
  };

  // Drag-and-drop support
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreview([]);
      setErrors([]);
      setMessage('');
      setShowMappingUI(false);
      setErrorReport(null);
      setColumnMapping({});
      setFileColumns([]);
      setShowAllPreview(false);
      const headers = await parseFileColumns(file);
      setFileColumns(headers);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview([]);
    setErrors([]);
    setMessage('');
    setShowMappingUI(false);
    setErrorReport(null);
    setColumnMapping({});
    setFileColumns([]);
    setShowAllPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (withMapping = false) => {
    if (!selectedFile) return;
    setUploading(true);
    setErrors([]);
    setMessage('');
    setErrorReport(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (withMapping && Object.keys(columnMapping).length > 0) {
      formData.append('columnMapping', JSON.stringify(columnMapping));
    }
    try {
      const res = await axios.post('/api/bulk-upload/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.preview || []);
      setMessage(res.data.message || 'Upload successful!');
      setErrors([]);
      setShowMappingUI(false);
      setErrorReport(null);
      setShowAllPreview(false);
      toast.success(res.data.message || 'Upload successful!');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      setPreview(err.response?.data?.preview || []);
      setErrors(err.response?.data?.errors || ['Upload failed.']);
      setMessage('');
      setShowAllPreview(false);
      if (err.response?.data?.errors?.some((e: string) => e.includes('Missing required column'))) {
        setShowMappingUI(true);
        if (err.response?.data?.preview?.length > 0) {
          setFileColumns(Object.keys(err.response.data.preview[0]));
        }
      }
      if (err.response?.data?.errorReport) {
        setErrorReport(err.response.data.errorReport);
        toast.error('Some rows failed. Download the error report for details.');
      } else {
        toast.error('Upload failed.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleMappingChange = (sysCol: string, userCol: string) => {
    setColumnMapping((prev) => ({ ...prev, [userCol]: sysCol }));
  };

  const handleMappingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpload(true);
  };

  const handleDownloadErrorReport = () => {
    if (!errorReport) return;
    const blob = new Blob([Uint8Array.from(atob(errorReport), c => c.charCodeAt(0))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_error_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <ToastContainer position="top-center" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4">Bulk Upload Applications</h2>
      <hr className="mb-6" />
      {/* Step 1: File Selection */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Step 1: Select File</label>
        <div
          className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          aria-label="File upload area"
        >
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 dark:text-gray-200">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="mt-2 text-red-500 hover:underline text-xs"
                aria-label="Remove file"
              >
                Remove
              </button>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Drag & drop or click to select a file (.txt, .csv, .xlsx)</span>
          )}
          <input
            type="file"
            accept=".txt,.csv,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
        </div>
      </div>
      {/* Step 2: Upload & Mapping */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Step 2: Upload & Map Columns</label>
        <button
          onClick={() => handleUpload(false)}
          disabled={!selectedFile || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {uploading ? (
            <span className="flex items-center"><span className="animate-spin mr-2">⏳</span>Uploading...</span>
          ) : 'Upload'}
        </button>
        {showMappingUI && fileColumns.length > 0 && (
          <form onSubmit={handleMappingSubmit} className="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-2">Map Your Columns to Required Columns</h3>
            {REQUIRED_COLUMNS.map((sysCol) => {
              const mapped = Object.keys(columnMapping).find(userCol => columnMapping[userCol] === sysCol);
              return (
                <div key={sysCol} className="mb-2 flex items-center">
                  <label className="mr-2 font-medium w-48">{sysCol}:</label>
                  <select
                    required
                    value={mapped || ''}
                    onChange={e => handleMappingChange(sysCol, e.target.value)}
                    className={`border rounded px-2 py-1 flex-1 ${!mapped ? 'border-red-500' : ''}`}
                  >
                    <option value="">Map to...</option>
                    {fileColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {!mapped && <span className="ml-2 text-xs text-red-500">Required</span>}
                </div>
              );
            })}
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Mapping & Upload
            </button>
          </form>
        )}
      </div>
      {/* Step 3: Preview & Error Report */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Step 3: Preview & Error Report</label>
        {message && <div className="mb-2 text-green-600 font-medium">{message}</div>}
        {errors.length > 0 && (
          <div className="mb-2 text-red-600">
            <ul>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {errorReport && (
          <div className="mb-2">
            <button
              onClick={handleDownloadErrorReport}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              aria-label="Download error report"
              title="Download a CSV of failed rows and errors"
            >
              Download Error Report
            </button>
            <span className="ml-2 text-xs text-gray-500">Rows with errors can be fixed and re-uploaded.</span>
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
                      <th key={col} className="border px-2 py-1 bg-gray-100 dark:bg-gray-700">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllPreview ? preview : preview.slice(0, 10)).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}>
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="border px-2 py-1">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && !showAllPreview && (
                <button
                  className="mt-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowAllPreview(true)}
                >
                  Show all {preview.length} rows
                </button>
              )}
              {showAllPreview && preview.length > 10 && (
                <button
                  className="mt-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowAllPreview(false)}
                >
                  Show first 10 rows
                </button>
              )}
            </div>
          </div>
        )}
        {preview.length === 0 && (
          <div className="text-gray-500 mt-2">No preview available yet.</div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadTab; 