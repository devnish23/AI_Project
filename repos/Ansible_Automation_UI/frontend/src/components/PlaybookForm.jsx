import React, { useState } from "https://cdn.skypack.dev/react";
import playbookService from "../services/playbookService.js";
import Notification from "./Notification.jsx";

export default function PlaybookForm() {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await playbookService.generatePlaybook(name, prompt);
    setMessage(res ? `Created ${name}` : "Error generating");
    setName("");
    setPrompt("");
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          className="border p-1 w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="border p-1 w-full"
          placeholder="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
        <button className="bg-blue-500 text-white px-2 py-1 rounded" type="submit">
          Generate
        </button>
      </form>
      {message && <Notification message={message} />}
    </div>
  );
}
