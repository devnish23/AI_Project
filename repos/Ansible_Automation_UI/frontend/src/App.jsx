const { useState } = React;

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // fake login: admin/admin or operator/operator
    if ((username === 'admin' && password === 'admin') ||
        (username === 'operator' && password === 'operator')) {
      onLogin(username === 'admin' ? 'admin' : 'operator');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <form className="max-w-sm mx-auto mt-20 bg-white p-6 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-4 text-center">Login</h2>
      <input
        className="border p-2 w-full mb-3"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-3"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" type="submit">Login</button>
    </form>
  );
}

function PlaybookManager() {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState('');
  const [saved, setSaved] = useState([]);

  const generate = async () => {
    // call backend AI generation
    const res = await fetch('/generate_playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, prompt })
    });
    const data = await res.json();
    setPreview(`# Playbook: ${name}\n` + prompt + `\n# Generated`);
    alert(data.message);
  };

  const loadSaved = async () => {
    const res = await fetch('/playbooks');
    const data = await res.json();
    setSaved(data);
  };

  const deletePlaybook = async (pb) => {
    alert('Delete ' + pb + ' (not implemented)');
  };

  React.useEffect(() => { loadSaved(); }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Playbook Manager</h2>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input className="border p-2 w-full mb-2" placeholder="Playbook Name" value={name} onChange={(e)=>setName(e.target.value)} />
          <textarea className="border p-2 w-full mb-2" rows="4" placeholder="Describe tasks" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
          <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={generate}>Generate</button>
        </div>
        <pre className="bg-gray-100 p-2 rounded overflow-auto">{preview}</pre>
      </div>
      <h3 className="font-semibold mt-4">Saved Playbooks</h3>
      <ul className="list-disc pl-5">
        {saved.map(pb => (
          <li key={pb} className="flex items-center justify-between mb-1">
            <span>{pb}</span>
            <button className="text-red-500" onClick={()=>deletePlaybook(pb)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OperatorPanel() {
  const [device, setDevice] = useState('');
  const [playbooks, setPlaybooks] = useState([]);
  const [logs, setLogs] = useState('');

  const onboard = async () => {
    const res = await fetch('/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device })
    });
    const data = await res.json();
    alert(data.status + ' ' + data.device);
  };

  const loadPlaybooks = async () => {
    const res = await fetch('/playbooks');
    const data = await res.json();
    setPlaybooks(data);
  };

  const runPlaybook = async (pb) => {
    const res = await fetch('/run_playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pb })
    });
    const data = await res.json();
    setLogs(`Executed ${pb}: ${data.status}`);
  };

  React.useEffect(() => { loadPlaybooks(); }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Operator Panel</h2>
      <div className="mb-4">
        <input className="border p-2 mr-2" placeholder="Device" value={device} onChange={(e)=>setDevice(e.target.value)} />
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={onboard}>Onboard</button>
      </div>
      <h3 className="font-semibold mt-4">Approved Playbooks</h3>
      <ul className="list-disc pl-5 mb-4">
        {playbooks.map(pb => (
          <li key={pb} className="flex items-center justify-between mb-1">
            <span>{pb}</span>
            <button className="text-blue-500" onClick={()=>runPlaybook(pb)}>Run</button>
          </li>
        ))}
      </ul>
      <pre className="bg-gray-100 p-2 rounded overflow-auto">{logs}</pre>
    </div>
  );
}

function App() {
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState('playbooks');

  if (!role) {
    return <Login onLogin={(r) => setRole(r)} />;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 bg-gray-800 text-white p-4">
        <div className="mb-4 font-bold text-xl">Automation</div>
        {role === 'admin' && (
          <button className={`block w-full text-left mb-2 ${tab==='playbooks'?'bg-gray-700':''}`} onClick={()=>setTab('playbooks')}>Playbook Manager</button>
        )}
        <button className={`block w-full text-left ${tab==='operator'?'bg-gray-700':''}`} onClick={()=>setTab('operator')}>Operator Panel</button>
        <button className="mt-4 text-red-400" onClick={()=>setRole(null)}>Logout</button>
      </aside>
      <main className="flex-1 bg-white">
        {tab === 'playbooks' && role === 'admin' && <PlaybookManager />}
        {tab === 'operator' && <OperatorPanel />}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
