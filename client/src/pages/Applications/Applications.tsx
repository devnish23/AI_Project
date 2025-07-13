import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../../services/api';
import { PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import Upload from '../Upload/Upload';
import BulkUploadTab from './BulkUploadTab';

interface Application {
  _id: string;
  name: string;
  version: string;
  vendor: string;
  status: string;
  createdAt: string;
  eolDate?: string;
  eoslDate?: string;
  patchReleased?: string;
  patchType?: string;
  patchDetails?: string;
}

interface ApplicationsProps {
  onApplicationsClick?: () => void;
  onPatchMgmtClick?: () => void;
}

const Applications: React.FC<ApplicationsProps> = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Application>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [customVersion, setCustomVersion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'applications' | 'patchmgmt' | 'bulkupload'>('applications');
  const [showPatchTab, setShowPatchTab] = useState(true);
  // Tab open/close logic
  const [showApplicationsTab, setShowApplicationsTab] = useState(true);
  const [showBulkUploadTab, setShowBulkUploadTab] = useState(false);

  // Filter state
  const [filterVendor, setFilterVendor] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterVersion, setFilterVersion] = useState('');

  // Filtered applications for Applications table
  const filteredApplications = applications.filter(app =>
    (!filterVendor || app.vendor.toLowerCase().includes(filterVendor.toLowerCase())) &&
    (!filterName || app.name.toLowerCase().includes(filterName.toLowerCase())) &&
    (!filterVersion || app.version.toLowerCase().includes(filterVersion.toLowerCase()))
  );

  // Filter state for Patch Management
  const [patchFilterVendor, setPatchFilterVendor] = useState('');
  const [patchFilterName, setPatchFilterName] = useState('');
  const [patchFilterVersion, setPatchFilterVersion] = useState('');

  const filteredPatchApplications = applications.filter(app =>
    (!patchFilterVendor || app.vendor.toLowerCase().includes(patchFilterVendor.toLowerCase())) &&
    (!patchFilterName || app.name.toLowerCase().includes(patchFilterName.toLowerCase())) &&
    (!patchFilterVersion || app.version.toLowerCase().includes(patchFilterVersion.toLowerCase()))
  );

  // Vendor/Product/Version data
  const vendorData: Record<string, { products: Record<string, string[]> }> = {
    Windows: {
      products: {
        'Windows Server': ['2016', '2019', '2022'],
        'Windows 10': ['1809', '1909', '21H2'],
        'MSSQL': ['2016', '2017', '2019', '2022']
      }
    },
    Redhat: {
      products: {
        'Red Hat Enterprise Linux': ['7.9', '8.6', '9.0'],
        'Red Hat Satellite': ['6.9', '6.10', '7.0']
      }
    },
    ESX: {
      products: {
        'ESXi': ['6.5', '6.7', '7.0', '8.0']
      }
    },
    Vcenter: {
      products: {
        'vCenter Server': ['6.5', '6.7', '7.0', '8.0']
      }
    },
    Netbackup: {
      products: {
        'NetBackup': ['8.1', '8.2', '9.0', '10.0']
      }
    },
    Nessus: {
      products: {
        'Nessus Scanner': ['8.13', '8.14', '10.0']
      }
    },
    CyberArk: {
      products: {
        'CyberArk Vault': ['11.5', '12.0', '13.0']
      }
    },
    Trellix: {
      products: {
        'Trellix EDR': ['3.0', '3.1', '3.2']
      }
    },
    'RSA authendication Manager': {
      products: {
        'RSA Authentication Manager': ['8.4', '8.5', '8.6']
      }
    },
  };

  const location = useLocation();
  useEffect(() => {
    if (location.state && (location.state as any).tab) {
      const tab = (location.state as any).tab;
      if (tab === 'applications' || tab === 'patchmgmt') {
        setActiveTab(tab);
        if (tab === 'applications') setShowApplicationsTab(true);
        if (tab === 'patchmgmt') setShowPatchTab(true);
      } else if (tab === 'bulkupload') {
        setShowBulkUploadTab(true);
      }
    }
  }, [location.state]);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await applicationsAPI.getAll();
      setApplications(res.data.applications || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVendor(e.target.value);
    setSelectedProduct('');
    setSelectedVersion('');
    setFormData({ ...formData, vendor: e.target.value, name: '', version: '' });
  };
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProduct(e.target.value);
    setSelectedVersion('');
    setFormData({ ...formData, name: e.target.value, version: '' });
  };
  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVersion(e.target.value);
    if (e.target.value === '__other__') {
      setFormData({ ...formData, version: '' });
    } else {
      setCustomVersion('');
      setFormData({ ...formData, version: e.target.value });
    }
  };
  const handleCustomVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomVersion(e.target.value);
    setFormData({ ...formData, version: e.target.value });
  };

  // Utility to clean payload
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
      await applicationsAPI.create(cleanPayload(formData));
      setShowForm(false);
      setFormData({});
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create application');
    }
  };

  const handleEdit = (app: Application) => {
    setEditingId(app._id);
    setFormData(app);
    setSelectedVendor(app.vendor || '');
    setSelectedProduct(app.name || '');
    setSelectedVersion(app.version || '');
    setCustomVersion('');
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await applicationsAPI.update(editingId, cleanPayload(formData));
      setShowForm(false);
      setEditingId(null);
      setFormData({});
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update application');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await applicationsAPI.delete(id);
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete application');
    }
  };

  // Sidebar callbacks
  const handleSidebarApplicationsClick = () => {
    setShowApplicationsTab(true);
    setActiveTab('applications');
  };
  const handleSidebarPatchMgmtClick = () => {
    setShowPatchTab(true);
    setActiveTab('patchmgmt');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Applications
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your infrastructure applications
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
          + Add Application
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        {/* Applications Tab */}
        {showApplicationsTab && (
          <div className="flex items-center">
            <button
              className={`px-4 py-2 rounded-t ${activeTab === 'applications' ? 'bg-white dark:bg-gray-800 font-semibold' : 'bg-gray-200 dark:bg-gray-700'} border-b-2 ${activeTab === 'applications' ? 'border-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('applications')}
            >
              Applications
            </button>
            <button
              className="ml-1 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Close Applications Tab"
              onClick={() => {
                if (!showPatchTab && !showBulkUploadTab) return; // Don't close last tab
                setShowApplicationsTab(false);
                if (showPatchTab) setActiveTab('patchmgmt');
                else if (showBulkUploadTab) setActiveTab('bulkupload');
              }}
            >
              <XMarkIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
        {/* PatchMgmt Tab */}
        {showPatchTab && (
          <div className="flex items-center">
            <button
              className={`px-4 py-2 rounded-t ${activeTab === 'patchmgmt' ? 'bg-white dark:bg-gray-800 font-semibold' : 'bg-gray-200 dark:bg-gray-700'} border-b-2 ${activeTab === 'patchmgmt' ? 'border-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('patchmgmt')}
            >
              Patch Management
            </button>
            <button
              className="ml-1 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Close Patch Management Tab"
              onClick={() => {
                if (!showApplicationsTab && !showBulkUploadTab) return; // Don't close last tab
                setShowPatchTab(false);
                if (showApplicationsTab) setActiveTab('applications');
                else if (showBulkUploadTab) setActiveTab('bulkupload');
              }}
            >
              <XMarkIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
        {/* Bulk Upload Tab */}
        {showBulkUploadTab && (
          <div className="flex items-center">
            <button
              className={`px-4 py-2 rounded-t ${activeTab === 'bulkupload' ? 'bg-white dark:bg-gray-800 font-semibold' : 'bg-gray-200 dark:bg-gray-700'} border-b-2 ${activeTab === 'bulkupload' ? 'border-blue-600' : 'border-transparent'}`}
              onClick={() => setActiveTab('bulkupload')}
            >
              Bulk Upload
            </button>
            <button
              className="ml-1 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Close Bulk Upload Tab"
              onClick={() => {
                if (!showApplicationsTab && !showPatchTab) return; // Don't close last tab
                setShowBulkUploadTab(false);
                if (showApplicationsTab) setActiveTab('applications');
                else if (showPatchTab) setActiveTab('patchmgmt');
              }}
            >
              <XMarkIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>
      {/* Tab Content */}
      {showApplicationsTab && activeTab === 'applications' && (
        <>
          {showForm && (
            <form
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4"
              onSubmit={editingId ? handleUpdate : handleCreate}
            >
              <div className="flex space-x-4">
                <select
                  name="vendor"
                  value={selectedVendor || formData.vendor || ''}
                  onChange={handleVendorChange}
                  className="border rounded px-3 py-2 flex-1"
                  required
                >
                  <option value="">Select Vendor</option>
                  {Object.keys(vendorData).map((vendor) => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
                <select
                  name="name"
                  value={selectedProduct || formData.name || ''}
                  onChange={handleProductChange}
                  className="border rounded px-3 py-2 flex-1"
                  required
                  disabled={!selectedVendor}
                >
                  <option value="">Select Product</option>
                  {selectedVendor &&
                    Object.keys(vendorData[selectedVendor]?.products || {}).map((product) => (
                      <option key={product} value={product}>{product}</option>
                    ))}
                </select>
                <select
                  name="version"
                  value={selectedVersion || formData.version || ''}
                  onChange={handleVersionChange}
                  className="border rounded px-3 py-2 flex-1"
                  required={!customVersion}
                  disabled={!selectedProduct}
                >
                  <option value="">Select Version</option>
                  {selectedVendor && selectedProduct &&
                    (vendorData[selectedVendor]?.products[selectedProduct] || []).map((ver) => (
                      <option key={ver} value={ver}>{ver}</option>
                    ))}
                  <option value="__other__">Other (specify...)</option>
                </select>
                {selectedVersion === '__other__' && (
                  <input
                    type="text"
                    placeholder="Enter custom version"
                    value={customVersion}
                    onChange={handleCustomVersionChange}
                    className="border rounded px-3 py-2 flex-1"
                    required
                  />
                )}
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
          {/* Filter bar for Applications */}
          <div className="flex space-x-4 mb-2">
            <input
              type="text"
              placeholder="Filter by Vendor"
              value={filterVendor}
              onChange={e => setFilterVendor(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Filter by Name"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Filter by Version"
              value={filterVersion}
              onChange={e => setFilterVersion(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          {/* Applications Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">No applications found</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EOL</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EOSL</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app, idx) => (
                      <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{idx + 1}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.vendor}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.name}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.version}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.eolDate ? new Date(app.eolDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.eoslDate ? new Date(app.eoslDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100 capitalize">{app.status}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 flex space-x-2">
                          <button
                            className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                            title="Edit"
                            onClick={() => handleEdit(app)}
                          >
                            <PencilSquareIcon className="h-5 w-5 text-yellow-600" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                            title="Delete"
                            onClick={() => handleDelete(app._id)}
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
        </>
      )}
      {showPatchTab && activeTab === 'patchmgmt' && (
        <>
          {/* Filter bar for Patch Management */}
          <div className="flex space-x-4 mb-2">
            <input
              type="text"
              placeholder="Filter by Vendor"
              value={patchFilterVendor}
              onChange={e => setPatchFilterVendor(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Filter by Name"
              value={patchFilterName}
              onChange={e => setPatchFilterName(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Filter by Version"
              value={patchFilterVersion}
              onChange={e => setPatchFilterVersion(e.target.value)}
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-x-auto" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patch Management</h2>
            {filteredPatchApplications.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No applications found
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patch Released</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patch Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patch Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatchApplications.map((app, idx) => (
                    <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{idx + 1}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.vendor}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.name}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.version}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.patchReleased || '-'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.patchType || '-'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{app.patchDetails || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      {showBulkUploadTab && activeTab === 'bulkupload' && (
        <BulkUploadTab onUploadSuccess={fetchApplications} />
      )}
    </div>
  );
};

export default Applications; 