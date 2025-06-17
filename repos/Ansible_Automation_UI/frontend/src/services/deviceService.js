const API = "";

async function onboard(device) {
  const res = await fetch(`${API}/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device }),
  });
  return res.ok;
}

export default { onboard };
