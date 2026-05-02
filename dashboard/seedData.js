// seedData.js

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

// =====================
// FIREBASE CONFIG
// =====================
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fyp-firebase-server.firebaseapp.com",
  projectId: "fyp-firebase-server",
  storageBucket: "fyp-firebase-server.appspot.com",
  messagingSenderId: "869791125735",
  appId: "1:869791125735:web:5a594589dac0460fe39242",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =====================
// CONFIG
// =====================
const profiles = {
  small: 20000,
  medium: 50000,
  large: 100000,
};

const scenarios = ["no_netem", "5g_emulated", "congested"];

const bandwidths = {
  low: 10,
  medium: 50,
  high: 100,
};

// =====================
// LATENCY MODEL
// =====================
function computeLatency({ scenario, payload, bandwidth }) {
  let edge, cloud;

  if (scenario === "no_netem") {
    edge = 60;
    cloud = 90;
  }

  if (scenario === "5g_emulated") {
    edge = 45;
    cloud = 90;
  }

  if (scenario === "congested") {
    edge = 140;
    cloud = 120;
  }

  const bwScale = {
    low: 1.3,
    medium: 1.0,
    high: 0.75,
  };

  edge *= bwScale[bandwidth];
  cloud *= bwScale[bandwidth];

  if (payload <= 20000) {
    edge *= 0.5;
    cloud *= 0.8;
  }

  if (payload <= 50000 && payload > 20000) {
    edge *= 0.75;
    cloud *= 0.9;
  }

  if (payload > 50000) {
    edge *= 1.5;
    cloud *= 1.0;
  }

  edge += Math.random() * 4;
  cloud += Math.random() * 3;

  return {
    edge: parseFloat(edge.toFixed(2)),
    cloud: parseFloat(cloud.toFixed(2)),
  };
}

// =====================
// CPU MODEL
// =====================
function computeCPU({ payload, scenario }) {
  let edgeCPU = 50;
  let cloudCPU = 50;

  if (payload <= 20000) {
    edgeCPU = 10;
    cloudCPU = 15;
  } else if (payload <= 50000) {
    edgeCPU = 35;
    cloudCPU = 30;
  } else {
    edgeCPU = 90;
    cloudCPU = 70;
  }

  if (scenario === "congested") {
    edgeCPU *= 1.15;
    cloudCPU *= 1.1;
  }

  if (scenario === "5g_emulated") {
    edgeCPU *= 0.95;
  }

  edgeCPU += (Math.random() - 0.5) * 6;
  cloudCPU += (Math.random() - 0.5) * 6;

  return {
    edge: Math.min(100, parseFloat(edgeCPU.toFixed(2))),
    cloud: Math.min(100, parseFloat(cloudCPU.toFixed(2))),
  };
}

// =====================
// GENERATOR
// =====================
function generateData(count) {
  const data = [];

  const profileKeys = Object.keys(profiles);
  const bandwidthKeys = Object.keys(bandwidths);

  for (let i = 0; i < count; i++) {
    const profile = profileKeys[Math.floor(Math.random() * profileKeys.length)];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const bandwidthKey =
      bandwidthKeys[Math.floor(Math.random() * bandwidthKeys.length)];

    // ✅ UPDATED PAYLOAD (ONLY CHANGE)
    const basePayload = profiles[profile];
    const variation = basePayload * 0.1; // 10%
    const payload = Math.floor(
      basePayload + (Math.random() * 2 - 1) * variation
    );

    const latency = computeLatency({
      scenario,
      payload,
      bandwidth: bandwidthKey,
    });

    const cpu = computeCPU({
      scenario,
      payload,
    });

    const now = new Date();
    const earlier = new Date(now.getTime() - Math.random() * 5000);

    data.push({
      edge_rtt_ms: latency.edge,
      cloud_rtt_ms: latency.cloud,

      edge_cpu: cpu.edge,
      cloud_cpu: cpu.cloud,

      payload_bytes: payload,
      fileSize: payload,

      profile,
      scenario,
      bandwidth: bandwidthKey,

      status: "completed",
      edge_ok: true,
      cloud_ok: true,

      createdAt: Timestamp.fromDate(earlier),
      completedAt: Timestamp.fromDate(now),
    });
  }

  return data;
}

// =====================
// SEED
// =====================
async function seed() {
  const fakeData = generateData(300);

  for (const item of fakeData) {
    await addDoc(collection(db, "jobs"), item);
  }

  console.log("Seeded with realistic payload variation");
}

seed();
