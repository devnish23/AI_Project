import React, { useState } from "https://cdn.skypack.dev/react";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handle = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <form onSubmit={handle} className="max-w-sm mx-auto mt-20 space-y-2">
      <input
        className="border p-1 w-full"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        className="border p-1 w-full"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="bg-blue-500 text-white px-2 py-1 rounded w-full" type="submit">
        Login
      </button>
    </form>
  );
}
