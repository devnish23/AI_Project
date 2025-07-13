import React, { useEffect, useState } from 'react';
import { vendorPortalsAPI } from '../../services/api';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface VendorPortal {
  _id: string;
  vendorName: string;
  portalUrl: string;
  apiEndpoint: string;
  createdAt: string;
}

const VendorPortals: React.FC = () => {
  const [vendorPortals, setVendorPortals] = useState<VendorPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorPortal>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchVendorPortals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorPortalsAPI.getAll();
      setVendorPortals(res.data.vendorPortals || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch vendor portals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorPortals();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const cleanPayload = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        cleaned[key] = data[key];
      }
    });
    return cleaned;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vendorPortalsAPI.create(cleanPayload(formData));
      setShowForm(false);
      setFormData({});
      fetchVendorPortals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create vendor portal');
    }
  };

  const handleEdit = (vp: VendorPortal) => {
    setEditingId(vp._id);
    setFormData(vp);
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await vendorPortalsAPI.update(editingId, cleanPayload(formData));
      setShowForm(false);
      setEditingId(null);
      setFormData({});
      fetchVendorPortals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update vendor portal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor portal?')) return;
    try {
      await vendorPortalsAPI.delete(id);
      fetchVendorPortals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete vendor portal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Vendor Portals
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage vendor portal configurations
          </p>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({});
          }}
        >
          + Add Vendor
        </button>
      </div>

      {showForm && (
        <form
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4"
          onSubmit={editingId ? handleUpdate : handleCreate}
        >
          <div className="flex space-x-4">
            <input
              type="text"
              name="vendorName"
              placeholder="Vendor Name"
              value={formData.vendorName || ''}
              onChange={handleInputChange}
              className="border rounded px-3 py-2 flex-1"
              required
            />
            <input
              type="url"
              name="portalUrl"
              placeholder="Portal URL"
              value={formData.portalUrl || ''}
              onChange={handleInputChange}
              className="border rounded px-3 py-2 flex-1"
              required
            />
            <input
              type="url"
              name="apiEndpoint"
              placeholder="API Endpoint"
              value={formData.apiEndpoint || ''}
              onChange={handleInputChange}
              className="border rounded px-3 py-2 flex-1"
              required
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({});
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {vendorPortals.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No vendor portals found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Portal URL</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">API Endpoint</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                </tr>
              </thead>
              <tbody>
                {vendorPortals.map((vp, idx) => (
                  <tr key={vp._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">{vp.vendorName}</td>
                    <td className="px-4 py-2"><a href={vp.portalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{vp.portalUrl}</a></td>
                    <td className="px-4 py-2"><a href={vp.apiEndpoint} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{vp.apiEndpoint}</a></td>
                    <td className="px-4 py-2">{new Date(vp.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 flex space-x-2">
                      <button
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        title="Edit"
                        onClick={() => handleEdit(vp)}
                      >
                        <PencilSquareIcon className="h-5 w-5 text-yellow-600" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                        title="Delete"
                        onClick={() => handleDelete(vp._id)}
                      >
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorPortals; 