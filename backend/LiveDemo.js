// src/LiveDemo.jsx

import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function LiveDemo() {
  const [file, setFile] = useState(null);
  const [scenario, setScenario] = useState("no_netem");
  const [bandwidth, setBandwidth] = useState("medium");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "https://fyp-backend-eokq.onrender.com";

  async function measureRTT(url) {
    const start = performance.now();
    await fetch(url, { cache: "no-store" });
    return performance.now() - start;
  }

  function measureCPU() {
    const start = performance.now();
    for (let i = 0; i < 2e7; i++) Math.sqrt(i);
    return performance.now() - start;
  }

  async function applyNetworkConditions(ms) {
    if (scenario === "congested") await new Promise(r => setTimeout(r, 150));
    if (scenario === "5g_emulated") await new Promise(r => setTimeout(r, 40));
    return ms;
  }

  const runTest = async () => {
    try {
      if (!file) return alert("Upload file");

      setLoading(true);

      // warm backend (avoids cold start RTT spikes)
      await fetch(BASE_URL + "/ping-edge");

      let edgeRTT = await measureRTT(BASE_URL + "/ping-edge");
      let cloudRTT = await measureRTT(BASE_URL + "/ping-cloud");

      edgeRTT = await applyNetworkConditions(edgeRTT);
      cloudRTT = await applyNetworkConditions(cloudRTT);

      const edgeCPU = measureCPU();

      // send file to backend
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(BASE_URL + "/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Backend failed");

      const cloudData = await res.json();

      const doc = {
        fileName: file.name,
        payload_bytes: file.size,
        scenario,
        bandwidth,
        edge_rtt_ms: parseFloat(edgeRTT.toFixed(2)),
        cloud_rtt_ms: parseFloat(cloudRTT.toFixed(2)),
        edge_cpu: parseFloat(edgeCPU.toFixed(2)),
        cloud_cpu: parseFloat(cloudData.cpu_time_ms.toFixed(2)),
        edge_ok: true,
        cloud_ok: true,
        status: "completed",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "jobs"), doc);

      setResult(doc);
    } catch (err) {
      console.error(err);
      alert("Test failed — backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>Live Edge vs Cloud Test</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <div>
        <label>Scenario:</label>
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="no_netem">Baseline</option>
          <option value="5g_emulated">5G</option>
          <option value="congested">Congested</option>
        </select>
      </div>

      <div>
        <label>Bandwidth:</label>
        <select value={bandwidth} onChange={(e) => setBandwidth(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <button onClick={runTest} disabled={loading}>
        {loading ? "Running..." : "Run Test"}
      </button>

      {result && (
        <table border="1" cellPadding="10" style={{ marginTop: "20px", width: "100%" }}>
          <thead>
            <tr>
              <th>Edge RTT</th>
              <th>Cloud RTT</th>
              <th>Edge CPU</th>
              <th>Cloud CPU</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{result.edge_rtt_ms}</td>
              <td>{result.cloud_rtt_ms}</td>
              <td>{result.edge_cpu}</td>
              <td>{result.cloud_cpu}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LiveDemo;
