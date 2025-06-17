import React from "https://cdn.skypack.dev/react";
import PlaybookForm from "../components/PlaybookForm.jsx";
import PlaybookList from "../components/PlaybookList.jsx";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Generate Playbook</h2>
      <PlaybookForm />
      <h2 className="text-xl font-bold">Available Playbooks</h2>
      <PlaybookList />
    </div>
  );
}
