import React, { useState } from "react";
import Comparison from "./Comparison";
import DataTable from "./DataTable";
import LiveDemo from "./LiveDemo";

function App() {
  const [section, setSection] = useState("comparison");

  return (
    <div style={{ padding: 20 }}>
      <h1>Edge vs Cloud Performance Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setSection("comparison")}>Comparison</button>
        <button onClick={() => setSection("data")}>Data</button>
        <button onClick={() => setSection("live")}>Live Demo</button>
      </div>

      {section === "comparison" && <Comparison />}
      {section === "data" && <DataTable />}
      {section === "live" && <LiveDemo />}
    </div>
  );
}

export default App;
