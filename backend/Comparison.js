// src/Comparison.jsx

import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Bar, Line } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
  Title,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
  Title
);

function Comparison() {
  const [chartData, setChartData] = useState(null);
  const [cpuChartData, setCpuChartData] = useState(null);
  const [payloadChartData, setPayloadChartData] = useState(null);
  const [loadChartData, setLoadChartData] = useState(null);
  const [bandwidthChartData, setBandwidthChartData] = useState(null);

  // ✅ ADDED
  const [metrics, setMetrics] = useState(null);

  const avg = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const chartOptions = (title, xLabel, yLabel = "Latency (ms)") => ({
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 28, weight: "bold" },
      },
      legend: { position: "top" },
    },
    scales: {
      x: { title: { display: true, text: xLabel } },
      y: { title: { display: true, text: yLabel } },
    },
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "jobs"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());

      const scenarios = ["no_netem", "5g_emulated", "congested"];

      // =====================
      // RTT
      // =====================
      const grouped = Object.fromEntries(
        scenarios.map((s) => [s, { edge: [], cloud: [] }])
      );

      data.forEach((d) => {
        if (grouped[d.scenario]) {
          grouped[d.scenario].edge.push(d.edge_rtt_ms);
          grouped[d.scenario].cloud.push(d.cloud_rtt_ms);
        }
      });

      setChartData({
        labels: ["Baseline", "5G", "Congested"],
        datasets: [
          {
            label: "Edge RTT",
            data: scenarios.map((s) => avg(grouped[s].edge)),
            backgroundColor: "#36A2EB",
          },
          {
            label: "Cloud RTT",
            data: scenarios.map((s) => avg(grouped[s].cloud)),
            backgroundColor: "#FF6384",
          },
        ],
      });

      // =====================
      // CPU (BY PAYLOAD)
      // =====================
      const cpuGrouped = {
        small: { edge: [], cloud: [] },
        medium: { edge: [], cloud: [] },
        large: { edge: [], cloud: [] },
      };

      data.forEach((d) => {
        const key = (d.profile || "").toLowerCase();
        if (cpuGrouped[key]) {
          cpuGrouped[key].edge.push(d.edge_cpu || 0);
          cpuGrouped[key].cloud.push(d.cloud_cpu || 0);
        }
      });

      setCpuChartData({
        labels: ["Small", "Medium", "Large"],
        datasets: [
          {
            label: "Edge CPU (%)",
            data: Object.values(cpuGrouped).map((g) => avg(g.edge)),
            backgroundColor: "#4BC0C0",
          },
          {
            label: "Cloud CPU (%)",
            data: Object.values(cpuGrouped).map((g) => avg(g.cloud)),
            backgroundColor: "#9966FF",
          },
        ],
      });

      // =====================
      // BANDWIDTH
      // =====================
      const bandwidths = ["low", "medium", "high"];
      const bwGrouped = {};

      bandwidths.forEach((bw) => {
        bwGrouped[bw] = Object.fromEntries(
          scenarios.map((s) => [s, { edge: [], cloud: [] }])
        );
      });

      data.forEach((d) => {
        if (bwGrouped[d.bandwidth]?.[d.scenario]) {
          bwGrouped[d.bandwidth][d.scenario].edge.push(d.edge_rtt_ms);
          bwGrouped[d.bandwidth][d.scenario].cloud.push(d.cloud_rtt_ms);
        }
      });

      const edgeBW = [];
      const cloudBW = [];

      bandwidths.forEach((bw) => {
        scenarios.forEach((s) => {
          edgeBW.push(avg(bwGrouped[bw][s].edge));
          cloudBW.push(avg(bwGrouped[bw][s].cloud));
        });
      });

      setBandwidthChartData({
        labels: [
          "Low-B", "Low-5G", "Low-C",
          "Med-B", "Med-5G", "Med-C",
          "High-B", "High-5G", "High-C",
        ],
        datasets: [
          { label: "Edge RTT", data: edgeBW, backgroundColor: "#36A2EB" },
          { label: "Cloud RTT", data: cloudBW, backgroundColor: "#FF6384" },
        ],
      });

      // =====================
      // PAYLOAD
      // =====================
      const payloadGrouped = {
        small: { edge: [], cloud: [] },
        medium: { edge: [], cloud: [] },
        large: { edge: [], cloud: [] },
      };

      data.forEach((d) => {
        if (payloadGrouped[d.profile]) {
          payloadGrouped[d.profile].edge.push(d.edge_rtt_ms);
          payloadGrouped[d.profile].cloud.push(d.cloud_rtt_ms);
        }
      });

      setPayloadChartData({
        labels: ["Small", "Medium", "Large"],
        datasets: [
          {
            label: "Edge RTT",
            data: Object.values(payloadGrouped).map((g) => avg(g.edge)),
            backgroundColor: "#36A2EB",
          },
          {
            label: "Cloud RTT",
            data: Object.values(payloadGrouped).map((g) => avg(g.cloud)),
            backgroundColor: "#FF6384",
          },
        ],
      });

      // =====================
      // LOAD
      // =====================
      const loadMap = {};

      data.forEach((d) => {
        const size = d.payload_bytes;
        if (!loadMap[size]) {
          loadMap[size] = { edge: [], cloud: [] };
        }
        loadMap[size].edge.push(d.edge_rtt_ms);
        loadMap[size].cloud.push(d.cloud_rtt_ms);
      });

      const loads = Object.keys(loadMap)
        .map(Number)
        .sort((a, b) => a - b);

      setLoadChartData({
        labels: loads.map((l) => `${l / 1000} KB`),
        datasets: [
          {
            label: "Edge Latency",
            data: loads.map((l) => avg(loadMap[l].edge)),
            borderColor: "#36A2EB",
            tension: 0.3,
          },
          {
            label: "Cloud Latency",
            data: loads.map((l) => avg(loadMap[l].cloud)),
            borderColor: "#FF6384",
            tension: 0.3,
          },
        ],
      });

      // =====================
      // 📊 METRICS (ADDED ONLY)
      // =====================
      const edgeVals = data.map((d) => d.edge_rtt_ms);
      const cloudVals = data.map((d) => d.cloud_rtt_ms);

      const avgEdge = avg(edgeVals);
      const avgCloud = avg(cloudVals);

      const advantage =
        avgCloud > 0 ? ((avgCloud - avgEdge) / avgCloud) * 100 : 0;

      setMetrics({
        avgEdge: avgEdge.toFixed(2),
        avgCloud: avgCloud.toFixed(2),
        advantage: advantage.toFixed(1),
        total: data.length,
      });
    });

    return () => unsubscribe();
  }, []);

  if (
    !chartData ||
    !cpuChartData ||
    !bandwidthChartData ||
    !payloadChartData ||
    !loadChartData ||
    !metrics
  ) {
    return <p>Loading...</p>;
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "auto" }}>

      {/* ✅ METRICS BAR (ONLY ADDITION) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <MetricCard title="Avg Edge RTT" value={`${metrics.avgEdge} ms`} color="#36A2EB" />
        <MetricCard title="Avg Cloud RTT" value={`${metrics.avgCloud} ms`} color="#FF6384" />
        <MetricCard title="Edge Advantage" value={`${metrics.advantage}%`} color="#4BC0C0" />
        <MetricCard title="Total Tests" value={metrics.total} color="#9966FF" />
      </div>

      <Bar data={chartData} options={chartOptions("RTT", "Scenario")} />

      <div style={{ marginTop: "40px" }}>
        <Bar data={cpuChartData} options={chartOptions("CPU Usage (by Payload)", "Payload Size", "CPU (%)")} />
      </div>

      <div style={{ marginTop: "40px" }}>
        <Bar data={bandwidthChartData} options={chartOptions("Bandwidth", "BW")} />
      </div>

      <div style={{ marginTop: "40px" }}>
        <Bar data={payloadChartData} options={chartOptions("Payload", "Size")} />
      </div>

      <div style={{ marginTop: "40px" }}>
        <Line data={loadChartData} options={chartOptions("Load", "Payload")} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <div style={{
      background: "#fff",
      padding: "20px",
      borderRadius: "10px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <div style={{ fontSize: "14px", color: "#666" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>
        {value}
      </div>
    </div>
  );
}

export default Comparison;
