import React from "https://cdn.skypack.dev/react";

export default function Navbar({ user }) {
  return (
    <nav className="bg-blue-600 text-white px-4 py-2 flex justify-between">
      <span className="font-bold">Ansible Automation UI</span>
      <span>{user ? `Logged in as ${user.username}` : ""}</span>
    </nav>
  );
}
