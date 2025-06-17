import React, { useState } from "https://cdn.skypack.dev/react";
import deviceService from "../services/deviceService.js";
import Notification from "./Notification.jsx";

export default function TestConnection() {
  const [device, setDevice] = useState("");
  const [message, setMessage] = useState(null);

  const handleTest = async (e) => {
    e.preventDefault();
    const res = await deviceService.onboard(device);
    setMessage(res ? `Connected to ${device}` : "Connection failed");
    setDevice("");
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleTest} className="space-y-2">
        <input
          className="border p-1 w-full"
          placeholder="Device"
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          required
        />
        <button className="bg-blue-500 text-white px-2 py-1 rounded" type="submit">
          Test Connection
        </button>
      </form>
      {message && <Notification message={message} />}
    </div>
  );
}
