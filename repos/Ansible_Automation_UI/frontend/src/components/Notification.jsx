import React from "https://cdn.skypack.dev/react";

export default function Notification({ message }) {
  return (
    <div className="mt-2 p-2 bg-green-200 text-green-800 rounded">
      {message}
    </div>
  );
}
