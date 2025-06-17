const API = "";

async function generatePlaybook(name, prompt) {
  const res = await fetch(`${API}/generate_playbook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, prompt }),
  });
  return res.ok;
}

async function listPlaybooks() {
  const res = await fetch(`${API}/playbooks`);
  if (res.ok) {
    return res.json();
  }
  return [];
}

async function runPlaybook(name) {
  await fetch(`${API}/run_playbook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export default { generatePlaybook, listPlaybooks, runPlaybook };
