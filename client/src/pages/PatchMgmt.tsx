import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../services/api';
import axios from 'axios';

interface Application {
  _id: string;
  vendor: string;
  name: string;
  version: string;
}

interface Advisory {
  _id: string;
  advisoryId: string;
  advisoryLink: string;
  product: string;
  issued: string;
  severity: string;
  synopsis: string;
}

const PatchMgmt: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [advLoading, setAdvLoading] = useState(true);
  const [advError, setAdvError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchAdvisories = async () => {
      setAdvLoading(true);
      setAdvError(null);
      try {
        const res = await axios.get('/api/patches/redhat');
        setAdvisories(res.data || []);
      } catch (err: any) {
        setAdvError(err.response?.data?.error || 'Failed to fetch advisories');
      } finally {
        setAdvLoading(false);
      }
    };
    fetchAdvisories();
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
      {/* Red Hat Advisories Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-x-auto" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
        <h2 className="text-lg font-semibold mb-2">Latest Red Hat Advisories</h2>
        {advLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
        ) : advError ? (
          <div className="text-center text-red-500 py-8">{advError}</div>
        ) : advisories.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">No advisories found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                {Object.keys(advisories[0]).map((key) => (
                  <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advisories.map((adv, idx) => (
                <tr key={(adv as any)._id || (adv as any).advisory || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2">{idx + 1}</td>
                  {Object.keys(advisories[0]).map((key) => (
                    <td key={key} className="px-4 py-2">
                      {typeof (adv as any)[key] === 'string' && (adv as any)[key].startsWith('http') ? (
                        <a href={(adv as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{(adv as any)[key]}</a>
                      ) : (adv as any)[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Existing Applications Table */}
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
                {Object.keys(applications[0]).map((key) => (
                  <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => (
                <tr key={(app as any)._id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2">{idx + 1}</td>
                  {Object.keys(applications[0]).map((key) => (
                    <td key={key} className="px-4 py-2">
                      {typeof (app as any)[key] === 'string' && (app as any)[key].startsWith('http') ? (
                        <a href={(app as any)[key]} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{(app as any)[key]}</a>
                      ) : typeof (app as any)[key] === 'object' && (app as any)[key] !== null ? JSON.stringify((app as any)[key]) : (app as any)[key]}
                    </td>
                  ))}
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