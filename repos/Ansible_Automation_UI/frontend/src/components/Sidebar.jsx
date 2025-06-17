import React from "https://cdn.skypack.dev/react";

export default function Sidebar({ role, onLogout }) {
  return (
    <aside className="w-48 bg-gray-800 text-white p-4 space-y-2">
      <div className="font-bold mb-2 capitalize">{role} Panel</div>
      <button
        className="bg-red-500 w-full py-1 rounded"
        onClick={onLogout}
      >
        Logout
      </button>
    </aside>
  );
}
