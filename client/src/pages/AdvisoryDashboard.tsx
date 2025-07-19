import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF6384', '#FFCE56', '#36A2EB', '#4BC0C0', '#9966FF', '#FF9F40', '#B2FF66', '#66FFB2', '#B266FF', '#FF66B2'];

const AdvisoryDashboard: React.FC = () => {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get('/patches/redhat')
      .then(res => setAdvisories(res.data))
      .catch(() => setError('Failed to load advisories'))
      .finally(() => setLoading(false));
  }, []);

  // Severity Distribution
  const severityCounts = advisories.reduce((acc, adv) => {
    acc[adv.severity] = (acc[adv.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const severityData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

  // Advisories Over Time (by month)
  const monthCounts = advisories.reduce((acc, adv) => {
    const month = adv.publishDate ? adv.publishDate.slice(0, 7) : 'Unknown';
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const monthData = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));

  // Product Family
  const familyCounts = advisories.reduce((acc, adv) => {
    const fam = adv.productFamily || 'Unknown';
    acc[fam] = (acc[fam] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const familyData = Object.entries(familyCounts).map(([name, value]) => ({ name, value }));

  // Top Tags
  const tagCounts = advisories.reduce((acc, adv) => {
    (adv.tags || []).forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const tagData = Object.entries(tagCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // EOL/EOSL Exposure
  const eolCounts = advisories.reduce((acc, adv) => {
    let status = 'Supported';
    if (adv.eolDate && adv.publishDate > adv.eolDate) status = 'EOL';
    if (adv.eoslDate && adv.publishDate > adv.eoslDate) status = 'EOSL';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const eolData = Object.entries(eolCounts).map(([name, value]) => ({ name, value }));

  return (
    <div style={{ margin: '2rem' }}>
      <h2>Advisory Dashboard</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3>Severity Distribution</h3>
            <PieChart width={350} height={250}>
              <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {severityData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
          <div>
            <h3>Advisories Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#36A2EB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3>Advisories by Product Family</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={familyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF6384" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3>Top Tags</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tagData} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#FFCE56" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3>EOL/EOSL Exposure</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={eolData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#9966FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisoryDashboard; 