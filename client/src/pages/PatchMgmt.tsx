import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../services/api';

interface Application {
  _id: string;
  vendor: string;
  name: string;
  version: string;
}

const PatchMgmt: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchApplications();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Patch Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View all application patch data
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : applications.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">No applications found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => (
                <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{app.vendor}</td>
                  <td className="px-4 py-2">{app.name}</td>
                  <td className="px-4 py-2">{app.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PatchMgmt; 