import React, { useEffect, useState } from "https://cdn.skypack.dev/react";
import PlaybookCard from "./PlaybookCard.jsx";
import playbookService from "../services/playbookService.js";

export default function PlaybookList({ showRun }) {
  const [playbooks, setPlaybooks] = useState([]);

  const load = async () => {
    const list = await playbookService.listPlaybooks();
    setPlaybooks(list || []);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (name) => {
    await playbookService.runPlaybook(name);
    alert(`Executed ${name}`);
  };

  return (
    <div className="space-y-2">
      {playbooks.map((pb) => (
        <PlaybookCard key={pb} name={pb} onRun={showRun ? run : null} />
      ))}
    </div>
  );
}
