const API = ""; // same origin

async function login(username, password) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) {
    return { role: username === "admin" ? "admin" : "operator" };
  }
  return null;
}

async function logout() {
  await fetch(`${API}/logout`, { method: "POST" });
}

export default { login, logout };
