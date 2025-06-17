import React from "https://cdn.skypack.dev/react";
import TestConnection from "../components/TestConnection.jsx";
import PlaybookList from "../components/PlaybookList.jsx";

export default function OperatorPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Onboard Device</h2>
      <TestConnection />
      <h2 className="text-xl font-bold">Run Playbook</h2>
      <PlaybookList showRun={true} />
    </div>
  );
}
