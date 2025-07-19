import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useParams } from 'react-router-dom';

interface Advisory {
  advisory: string;
  synopsis: string;
  severity: string;
  products: string;
  publishDate: string;
  cves: string[];
  link: string;
}

interface Application {
  _id: string;
  vendor: string;
  name: string;
  version: string;
  status?: string;
  eolDate?: string;
  eoslDate?: string;
}

interface WindowsAdvisory {
  _id: string;
  kbNumber: string;
  title: string;
  severity: string;
  products: string;
  publishDate: string;
  cves: string[];
  link: string;
  version?: string;
}

// Interfaces for each vendor
interface ESXiAdvisory { _id: string; advisoryId: string; title: string; severity: string; products: string; version: string; publishDate: string; cves: string[]; link: string; }
interface VCenterAdvisory extends ESXiAdvisory {}
interface CyberArkAdvisory extends ESXiAdvisory {}
interface RSAAdvisory extends ESXiAdvisory {}
interface SolarWindsAdvisory extends ESXiAdvisory {}
interface McAfeeAdvisory extends ESXiAdvisory {}
interface NessusAdvisory extends ESXiAdvisory {}

function extractVersion(products: string): string {
  let match = products.match(/Linux[\s-]*(\d+(?:\.\d+)?)/i);
  if (match) return match[1];
  match = products.match(/RHEL[\s-]*(\d+(?:\.\d+)?)/i);
  if (match) return match[1];
  return '-';
}

function extractWindowsVersion(products: string): string {
  // Example: "windows server 2019 standard" → "2019 standard"
  const match = products.match(/windows server\s*(\d{4}(?:\s+\w+)*)/i);
  return match ? match[1].trim() : '';
}

const PatchMgmt: React.FC = () => {
  const { vendor } = useParams<{ vendor: string }>();
  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Advisories state
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError] = useState<string | null>(null);

  const [windowsAdvisories, setWindowsAdvisories] = useState<WindowsAdvisory[]>([]);
  const [winLoading, setWinLoading] = useState(false);
  const [winError, setWinError] = useState<string | null>(null);

  // State for each vendor
  const [esxiAdvisories, setEsxiAdvisories] = useState<ESXiAdvisory[]>([]);
  const [esxiLoading, setEsxiLoading] = useState(false);
  const [esxiError, setEsxiError] = useState<string | null>(null);
  const [vcenterAdvisories, setVcenterAdvisories] = useState<VCenterAdvisory[]>([]);
  const [vcenterLoading, setVcenterLoading] = useState(false);
  const [vcenterError, setVcenterError] = useState<string | null>(null);
  const [cyberArkAdvisories, setCyberArkAdvisories] = useState<CyberArkAdvisory[]>([]);
  const [cyberArkLoading, setCyberArkLoading] = useState(false);
  const [cyberArkError, setCyberArkError] = useState<string | null>(null);
  const [rsaAdvisories, setRsaAdvisories] = useState<RSAAdvisory[]>([]);
  const [rsaLoading, setRsaLoading] = useState(false);
  const [rsaError, setRsaError] = useState<string | null>(null);
  const [solarWindsAdvisories, setSolarWindsAdvisories] = useState<SolarWindsAdvisory[]>([]);
  const [solarWindsLoading, setSolarWindsLoading] = useState(false);
  const [solarWindsError, setSolarWindsError] = useState<string | null>(null);
  const [mcafeeAdvisories, setMcafeeAdvisories] = useState<McAfeeAdvisory[]>([]);
  const [mcafeeLoading, setMcafeeLoading] = useState(false);
  const [mcafeeError, setMcafeeError] = useState<string | null>(null);
  const [nessusAdvisories, setNessusAdvisories] = useState<NessusAdvisory[]>([]);
  const [nessusLoading, setNessusLoading] = useState(false);
  const [nessusError, setNessusError] = useState<string | null>(null);

  // Add filtering/search state and logic for each vendor table
  const [esxiSearch, setEsxiSearch] = useState('');
  const [esxiFilters, setEsxiFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const esxiSeverities = Array.from(new Set(esxiAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredEsxi = esxiAdvisories.filter(a => {
    const searchText = esxiSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (esxiFilters.advisoryId && !a.advisoryId.toLowerCase().includes(esxiFilters.advisoryId.toLowerCase())) return false;
    if (esxiFilters.title && !a.title.toLowerCase().includes(esxiFilters.title.toLowerCase())) return false;
    if (esxiFilters.severity && a.severity !== esxiFilters.severity) return false;
    if (esxiFilters.products && !a.products.toLowerCase().includes(esxiFilters.products.toLowerCase())) return false;
    if (esxiFilters.version && !((a.version || '').toLowerCase()).includes(esxiFilters.version.toLowerCase())) return false;
    if (esxiFilters.publishDate && !a.publishDate.toLowerCase().includes(esxiFilters.publishDate.toLowerCase())) return false;
    if (esxiFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(esxiFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [vcenterSearch, setVcenterSearch] = useState('');
  const [vcenterFilters, setVcenterFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const vcenterSeverities = Array.from(new Set(vcenterAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredVcenter = vcenterAdvisories.filter(a => {
    const searchText = vcenterSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (vcenterFilters.advisoryId && !a.advisoryId.toLowerCase().includes(vcenterFilters.advisoryId.toLowerCase())) return false;
    if (vcenterFilters.title && !a.title.toLowerCase().includes(vcenterFilters.title.toLowerCase())) return false;
    if (vcenterFilters.severity && a.severity !== vcenterFilters.severity) return false;
    if (vcenterFilters.products && !a.products.toLowerCase().includes(vcenterFilters.products.toLowerCase())) return false;
    if (vcenterFilters.version && !((a.version || '').toLowerCase()).includes(vcenterFilters.version.toLowerCase())) return false;
    if (vcenterFilters.publishDate && !a.publishDate.toLowerCase().includes(vcenterFilters.publishDate.toLowerCase())) return false;
    if (vcenterFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(vcenterFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [cyberArkSearch, setCyberArkSearch] = useState('');
  const [cyberArkFilters, setCyberArkFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const cyberArkSeverities = Array.from(new Set(cyberArkAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredCyberArk = cyberArkAdvisories.filter(a => {
    const searchText = cyberArkSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (cyberArkFilters.advisoryId && !a.advisoryId.toLowerCase().includes(cyberArkFilters.advisoryId.toLowerCase())) return false;
    if (cyberArkFilters.title && !a.title.toLowerCase().includes(cyberArkFilters.title.toLowerCase())) return false;
    if (cyberArkFilters.severity && a.severity !== cyberArkFilters.severity) return false;
    if (cyberArkFilters.products && !a.products.toLowerCase().includes(cyberArkFilters.products.toLowerCase())) return false;
    if (cyberArkFilters.version && !((a.version || '').toLowerCase()).includes(cyberArkFilters.version.toLowerCase())) return false;
    if (cyberArkFilters.publishDate && !a.publishDate.toLowerCase().includes(cyberArkFilters.publishDate.toLowerCase())) return false;
    if (cyberArkFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(cyberArkFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [rsaSearch, setRsaSearch] = useState('');
  const [rsaFilters, setRsaFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const rsaSeverities = Array.from(new Set(rsaAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredRsa = rsaAdvisories.filter(a => {
    const searchText = rsaSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (rsaFilters.advisoryId && !a.advisoryId.toLowerCase().includes(rsaFilters.advisoryId.toLowerCase())) return false;
    if (rsaFilters.title && !a.title.toLowerCase().includes(rsaFilters.title.toLowerCase())) return false;
    if (rsaFilters.severity && a.severity !== rsaFilters.severity) return false;
    if (rsaFilters.products && !a.products.toLowerCase().includes(rsaFilters.products.toLowerCase())) return false;
    if (rsaFilters.version && !((a.version || '').toLowerCase()).includes(rsaFilters.version.toLowerCase())) return false;
    if (rsaFilters.publishDate && !a.publishDate.toLowerCase().includes(rsaFilters.publishDate.toLowerCase())) return false;
    if (rsaFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(rsaFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [solarWindsSearch, setSolarWindsSearch] = useState('');
  const [solarWindsFilters, setSolarWindsFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const solarWindsSeverities = Array.from(new Set(solarWindsAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredSolarWinds = solarWindsAdvisories.filter(a => {
    const searchText = solarWindsSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (solarWindsFilters.advisoryId && !a.advisoryId.toLowerCase().includes(solarWindsFilters.advisoryId.toLowerCase())) return false;
    if (solarWindsFilters.title && !a.title.toLowerCase().includes(solarWindsFilters.title.toLowerCase())) return false;
    if (solarWindsFilters.severity && a.severity !== solarWindsFilters.severity) return false;
    if (solarWindsFilters.products && !a.products.toLowerCase().includes(solarWindsFilters.products.toLowerCase())) return false;
    if (solarWindsFilters.version && !((a.version || '').toLowerCase()).includes(solarWindsFilters.version.toLowerCase())) return false;
    if (solarWindsFilters.publishDate && !a.publishDate.toLowerCase().includes(solarWindsFilters.publishDate.toLowerCase())) return false;
    if (solarWindsFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(solarWindsFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [mcafeeSearch, setMcafeeSearch] = useState('');
  const [mcafeeFilters, setMcafeeFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const mcafeeSeverities = Array.from(new Set(mcafeeAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredMcafee = mcafeeAdvisories.filter(a => {
    const searchText = mcafeeSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (mcafeeFilters.advisoryId && !a.advisoryId.toLowerCase().includes(mcafeeFilters.advisoryId.toLowerCase())) return false;
    if (mcafeeFilters.title && !a.title.toLowerCase().includes(mcafeeFilters.title.toLowerCase())) return false;
    if (mcafeeFilters.severity && a.severity !== mcafeeFilters.severity) return false;
    if (mcafeeFilters.products && !a.products.toLowerCase().includes(mcafeeFilters.products.toLowerCase())) return false;
    if (mcafeeFilters.version && !((a.version || '').toLowerCase()).includes(mcafeeFilters.version.toLowerCase())) return false;
    if (mcafeeFilters.publishDate && !a.publishDate.toLowerCase().includes(mcafeeFilters.publishDate.toLowerCase())) return false;
    if (mcafeeFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(mcafeeFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [nessusSearch, setNessusSearch] = useState('');
  const [nessusFilters, setNessusFilters] = useState({
    advisoryId: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const nessusSeverities = Array.from(new Set(nessusAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredNessus = nessusAdvisories.filter(a => {
    const searchText = nessusSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisoryId.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (nessusFilters.advisoryId && !a.advisoryId.toLowerCase().includes(nessusFilters.advisoryId.toLowerCase())) return false;
    if (nessusFilters.title && !a.title.toLowerCase().includes(nessusFilters.title.toLowerCase())) return false;
    if (nessusFilters.severity && a.severity !== nessusFilters.severity) return false;
    if (nessusFilters.products && !a.products.toLowerCase().includes(nessusFilters.products.toLowerCase())) return false;
    if (nessusFilters.version && !((a.version || '').toLowerCase()).includes(nessusFilters.version.toLowerCase())) return false;
    if (nessusFilters.publishDate && !a.publishDate.toLowerCase().includes(nessusFilters.publishDate.toLowerCase())) return false;
    if (nessusFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(nessusFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [windowsSearch, setWindowsSearch] = useState('');
  const [windowsFilters, setWindowsFilters] = useState({
    kbNumber: '',
    title: '',
    severity: '',
    products: '',
    version: '',
    publishDate: '',
    cves: '',
  });
  const windowsSeverities = Array.from(new Set(windowsAdvisories.map(a => a.severity))).filter(Boolean);
  const filteredWindows = windowsAdvisories.filter(a => {
    const searchText = windowsSearch.trim().toLowerCase();
    if (searchText && !(
      a.kbNumber.toLowerCase().includes(searchText) ||
      a.title.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      (a.version || '').toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (windowsFilters.kbNumber && !a.kbNumber.toLowerCase().includes(windowsFilters.kbNumber.toLowerCase())) return false;
    if (windowsFilters.title && !a.title.toLowerCase().includes(windowsFilters.title.toLowerCase())) return false;
    if (windowsFilters.severity && a.severity !== windowsFilters.severity) return false;
    if (windowsFilters.products && !a.products.toLowerCase().includes(windowsFilters.products.toLowerCase())) return false;
    if (windowsFilters.version && !((a.version || '').toLowerCase()).includes(windowsFilters.version.toLowerCase())) return false;
    if (windowsFilters.publishDate && !a.publishDate.toLowerCase().includes(windowsFilters.publishDate.toLowerCase())) return false;
    if (windowsFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(windowsFilters.cves.toLowerCase()))) return false;
    return true;
  });

  const [redHatSearch, setRedHatSearch] = useState('');
  const [redHatFilters, setRedHatFilters] = useState({
    advisory: '',
    synopsis: '',
    severity: '',
    products: '',
    publishDate: '',
    cves: '',
  });
  const redHatSeverities = Array.from(new Set(advisories.map(a => a.severity))).filter(Boolean);
  const filteredRedHat = advisories.filter(a => {
    const searchText = redHatSearch.trim().toLowerCase();
    if (searchText && !(
      a.advisory.toLowerCase().includes(searchText) ||
      a.synopsis.toLowerCase().includes(searchText) ||
      a.severity.toLowerCase().includes(searchText) ||
      a.products.toLowerCase().includes(searchText) ||
      a.publishDate.toLowerCase().includes(searchText) ||
      (a.cves && a.cves.join(' ').toLowerCase().includes(searchText))
    )) return false;
    if (redHatFilters.advisory && !a.advisory.toLowerCase().includes(redHatFilters.advisory.toLowerCase())) return false;
    if (redHatFilters.synopsis && !a.synopsis.toLowerCase().includes(redHatFilters.synopsis.toLowerCase())) return false;
    if (redHatFilters.severity && a.severity !== redHatFilters.severity) return false;
    if (redHatFilters.products && !a.products.toLowerCase().includes(redHatFilters.products.toLowerCase())) return false;
    if (redHatFilters.publishDate && !a.publishDate.toLowerCase().includes(redHatFilters.publishDate.toLowerCase())) return false;
    if (redHatFilters.cves && !(a.cves && a.cves.join(' ').toLowerCase().includes(redHatFilters.cves.toLowerCase()))) return false;
    return true;
  });

  useEffect(() => {
    setAppLoading(true);
    api.get('/applications')
      .then(res => setApplications(res.data.applications || []))
      .catch(() => setAppError('Failed to load applications'))
      .finally(() => setAppLoading(false));
  }, []);

  useEffect(() => {
    setAdvLoading(true);
    api.get('/patches/redhat')
      .then(res => setAdvisories(res.data))
      .catch(() => setAdvError('Failed to load advisories'))
      .finally(() => setAdvLoading(false));
  }, []);

  useEffect(() => {
    setWinLoading(true);
    api.get('/patches/windows')
      .then(res => setWindowsAdvisories(res.data))
      .catch(() => setWinError('Failed to load Windows advisories'))
      .finally(() => setWinLoading(false));
  }, []);

  // Fetch logic for each vendor
  useEffect(() => {
    setEsxiLoading(true);
    api.get('/patches/esxi')
      .then(res => setEsxiAdvisories(res.data))
      .catch(() => setEsxiError('Failed to load ESXi advisories'))
      .finally(() => setEsxiLoading(false));
  }, []);
  useEffect(() => {
    setVcenterLoading(true);
    api.get('/patches/vcenter')
      .then(res => setVcenterAdvisories(res.data))
      .catch(() => setVcenterError('Failed to load vCenter advisories'))
      .finally(() => setVcenterLoading(false));
  }, []);
  useEffect(() => {
    setCyberArkLoading(true);
    api.get('/patches/cyberark')
      .then(res => setCyberArkAdvisories(res.data))
      .catch(() => setCyberArkError('Failed to load CyberArk advisories'))
      .finally(() => setCyberArkLoading(false));
  }, []);
  useEffect(() => {
    setRsaLoading(true);
    api.get('/patches/rsa')
      .then(res => setRsaAdvisories(res.data))
      .catch(() => setRsaError('Failed to load RSA advisories'))
      .finally(() => setRsaLoading(false));
  }, []);
  useEffect(() => {
    setSolarWindsLoading(true);
    api.get('/patches/solarwinds')
      .then(res => setSolarWindsAdvisories(res.data))
      .catch(() => setSolarWindsError('Failed to load SolarWinds advisories'))
      .finally(() => setSolarWindsLoading(false));
  }, []);
  useEffect(() => {
    setMcafeeLoading(true);
    api.get('/patches/mcafee')
      .then(res => setMcafeeAdvisories(res.data))
      .catch(() => setMcafeeError('Failed to load McAfee advisories'))
      .finally(() => setMcafeeLoading(false));
  }, []);
  useEffect(() => {
    setNessusLoading(true);
    api.get('/patches/nessus')
      .then(res => setNessusAdvisories(res.data))
      .catch(() => setNessusError('Failed to load Nessus advisories'))
      .finally(() => setNessusLoading(false));
  }, []);

  return (
    <div style={{ margin: '2rem 0' }}>
      <h2>Applications</h2>
      {appLoading && <div>Loading applications...</div>}
      {appError && <div style={{ color: 'red' }}>{appError}</div>}
      {!appLoading && !appError && (
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Vendor</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Name</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Version</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Status</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>EOL Date</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>EOSL Date</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app._id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.vendor}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.name}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.version}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.status || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.eolDate || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{app.eoslDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {vendor === 'redhat' && (
        <>
          <h2>RHEL Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={redHatSearch} onChange={e => setRedHatSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {advLoading && <div>Loading advisories...</div>}
          {advError && <div style={{ color: 'red' }}>{advError}</div>}
          {!advLoading && !advError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory" value={redHatFilters.advisory} onChange={e => setRedHatFilters(f => ({ ...f, advisory: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Synopsis" value={redHatFilters.synopsis} onChange={e => setRedHatFilters(f => ({ ...f, synopsis: e.target.value }))} style={{ width: '200px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={redHatFilters.severity} onChange={e => setRedHatFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {redHatSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={redHatFilters.products} onChange={e => setRedHatFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={redHatFilters.publishDate} onChange={e => setRedHatFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={redHatFilters.cves} onChange={e => setRedHatFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRedHat.map(adv => (
                    <tr key={adv.advisory}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisory}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.synopsis}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{extractVersion(adv.products)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'windows' && (
        <>
          <h2>Windows Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={windowsSearch} onChange={e => setWindowsSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {winLoading && <div>Loading Windows advisories...</div>}
          {winError && <div style={{ color: 'red' }}>{winError}</div>}
          {!winLoading && !winError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="KB" value={windowsFilters.kbNumber} onChange={e => setWindowsFilters(f => ({ ...f, kbNumber: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={windowsFilters.title} onChange={e => setWindowsFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={windowsFilters.severity} onChange={e => setWindowsFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {windowsSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={windowsFilters.products} onChange={e => setWindowsFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={windowsFilters.version} onChange={e => setWindowsFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={windowsFilters.publishDate} onChange={e => setWindowsFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={windowsFilters.cves} onChange={e => setWindowsFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWindows.map(win => (
                    <tr key={win._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.kbNumber}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.version || extractWindowsVersion(win.products)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{win.cves && win.cves.length > 0 ? win.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={win.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'esxi' && (
        <>
          <h2>ESXi Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={esxiSearch} onChange={e => setEsxiSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {esxiLoading && <div>Loading ESXi advisories...</div>}
          {esxiError && <div style={{ color: 'red' }}>{esxiError}</div>}
          {!esxiLoading && !esxiError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={esxiFilters.advisoryId} onChange={e => setEsxiFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={esxiFilters.title} onChange={e => setEsxiFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={esxiFilters.severity} onChange={e => setEsxiFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {esxiSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={esxiFilters.products} onChange={e => setEsxiFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={esxiFilters.version} onChange={e => setEsxiFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={esxiFilters.publishDate} onChange={e => setEsxiFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={esxiFilters.cves} onChange={e => setEsxiFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEsxi.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'vcenter' && (
        <>
          <h2>vCenter Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={vcenterSearch} onChange={e => setVcenterSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {vcenterLoading && <div>Loading vCenter advisories...</div>}
          {vcenterError && <div style={{ color: 'red' }}>{vcenterError}</div>}
          {!vcenterLoading && !vcenterError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={vcenterFilters.advisoryId} onChange={e => setVcenterFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={vcenterFilters.title} onChange={e => setVcenterFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={vcenterFilters.severity} onChange={e => setVcenterFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {vcenterSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={vcenterFilters.products} onChange={e => setVcenterFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={vcenterFilters.version} onChange={e => setVcenterFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={vcenterFilters.publishDate} onChange={e => setVcenterFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={vcenterFilters.cves} onChange={e => setVcenterFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVcenter.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'cyberark' && (
        <>
          <h2>CyberArk Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={cyberArkSearch} onChange={e => setCyberArkSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {cyberArkLoading && <div>Loading CyberArk advisories...</div>}
          {cyberArkError && <div style={{ color: 'red' }}>{cyberArkError}</div>}
          {!cyberArkLoading && !cyberArkError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={cyberArkFilters.advisoryId} onChange={e => setCyberArkFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={cyberArkFilters.title} onChange={e => setCyberArkFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={cyberArkFilters.severity} onChange={e => setCyberArkFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {cyberArkSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={cyberArkFilters.products} onChange={e => setCyberArkFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={cyberArkFilters.version} onChange={e => setCyberArkFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={cyberArkFilters.publishDate} onChange={e => setCyberArkFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={cyberArkFilters.cves} onChange={e => setCyberArkFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCyberArk.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'rsa' && (
        <>
          <h2>RSA Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={rsaSearch} onChange={e => setRsaSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {rsaLoading && <div>Loading RSA advisories...</div>}
          {rsaError && <div style={{ color: 'red' }}>{rsaError}</div>}
          {!rsaLoading && !rsaError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={rsaFilters.advisoryId} onChange={e => setRsaFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={rsaFilters.title} onChange={e => setRsaFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={rsaFilters.severity} onChange={e => setRsaFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {rsaSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={rsaFilters.products} onChange={e => setRsaFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={rsaFilters.version} onChange={e => setRsaFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={rsaFilters.publishDate} onChange={e => setRsaFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={rsaFilters.cves} onChange={e => setRsaFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRsa.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'solarwinds' && (
        <>
          <h2>SolarWinds Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={solarWindsSearch} onChange={e => setSolarWindsSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {solarWindsLoading && <div>Loading SolarWinds advisories...</div>}
          {solarWindsError && <div style={{ color: 'red' }}>{solarWindsError}</div>}
          {!solarWindsLoading && !solarWindsError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={solarWindsFilters.advisoryId} onChange={e => setSolarWindsFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={solarWindsFilters.title} onChange={e => setSolarWindsFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={solarWindsFilters.severity} onChange={e => setSolarWindsFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {solarWindsSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={solarWindsFilters.products} onChange={e => setSolarWindsFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={solarWindsFilters.version} onChange={e => setSolarWindsFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={solarWindsFilters.publishDate} onChange={e => setSolarWindsFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={solarWindsFilters.cves} onChange={e => setSolarWindsFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSolarWinds.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'mcafee' && (
        <>
          <h2>McAfee Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={mcafeeSearch} onChange={e => setMcafeeSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {mcafeeLoading && <div>Loading McAfee advisories...</div>}
          {mcafeeError && <div style={{ color: 'red' }}>{mcafeeError}</div>}
          {!mcafeeLoading && !mcafeeError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={mcafeeFilters.advisoryId} onChange={e => setMcafeeFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={mcafeeFilters.title} onChange={e => setMcafeeFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={mcafeeFilters.severity} onChange={e => setMcafeeFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {mcafeeSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={mcafeeFilters.products} onChange={e => setMcafeeFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={mcafeeFilters.version} onChange={e => setMcafeeFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={mcafeeFilters.publishDate} onChange={e => setMcafeeFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={mcafeeFilters.cves} onChange={e => setMcafeeFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMcafee.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {vendor === 'nessus' && (
        <>
          <h2>Nessus Security Advisories</h2>
          <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search..." value={nessusSearch} onChange={e => setNessusSearch(e.target.value)} style={{ padding: '4px 8px', minWidth: 180 }} />
          </div>
          {nessusLoading && <div>Loading Nessus advisories...</div>}
          {nessusError && <div style={{ color: 'red' }}>{nessusError}</div>}
          {!nessusLoading && !nessusError && (
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Advisory ID" value={nessusFilters.advisoryId} onChange={e => setNessusFilters(f => ({ ...f, advisoryId: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Title" value={nessusFilters.title} onChange={e => setNessusFilters(f => ({ ...f, title: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc', minWidth: 120 }}>
                      <select value={nessusFilters.severity} onChange={e => setNessusFilters(f => ({ ...f, severity: e.target.value }))} style={{ minWidth: 100 }}>
                        <option value="">All Severities</option>
                        {nessusSeverities.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Products" value={nessusFilters.products} onChange={e => setNessusFilters(f => ({ ...f, products: e.target.value }))} style={{ width: '120px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Version" value={nessusFilters.version} onChange={e => setNessusFilters(f => ({ ...f, version: e.target.value }))} style={{ width: '90px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="Publish Date" value={nessusFilters.publishDate} onChange={e => setNessusFilters(f => ({ ...f, publishDate: e.target.value }))} style={{ width: '110px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><input type="text" placeholder="CVEs" value={nessusFilters.cves} onChange={e => setNessusFilters(f => ({ ...f, cves: e.target.value }))} style={{ width: '100px' }} /></th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNessus.map(adv => (
                    <tr key={adv._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.advisoryId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.title}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.severity}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.products}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.version}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.publishDate}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{adv.cves && adv.cves.length > 0 ? adv.cves.join(', ') : '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <a href={adv.link} target="_blank" rel="noopener noreferrer">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {!vendor && <div>Select a vendor from the sidebar to view advisories.</div>}
    </div>
  );
};

export default PatchMgmt; 