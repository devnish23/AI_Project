import React from "https://cdn.skypack.dev/react";

export default function PlaybookCard({ name, onRun }) {
  return (
    <div className="border p-2 rounded shadow flex justify-between items-center">
      <span>{name}</span>
      {onRun && (
        <button
          className="bg-green-500 text-white px-2 py-1 rounded"
          onClick={() => onRun(name)}
        >
          Run
        </button>
      )}
    </div>
  );
}
