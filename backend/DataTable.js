// src/DataTable.jsx

import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

function DataTable() {
  const [data, setData] = useState([]);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rows = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(rows);
      } else {
        setData([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "timestamp" || sortField === "createdAt") {
      valA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      valB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    }

    if (valA === undefined) return 1;
    if (valB === undefined) return -1;

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;

    return 0;
  });

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Raw Benchmark Data</h2>

      <div style={{ marginBottom: "15px" }}>
        <label>Sort by: </label>

        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="timestamp">Date</option>
          <option value="cloud_rtt_ms">Cloud RTT</option>
          <option value="edge_rtt_ms">Edge RTT</option>
          <option value="payload_bytes">Payload Size</option>
          <option value="edge_cpu">Edge CPU</option>
          <option value="cloud_cpu">Cloud CPU</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Profile</th>
              <th>Edge RTT (ms)</th>
              <th>Cloud RTT (ms)</th>
              <th>Edge CPU (%)</th>
              <th>Cloud CPU (%)</th>
              <th>Payload (bytes)</th>
              <th>Edge OK</th>
              <th>Cloud OK</th>
            </tr>
          </thead>

          <tbody>
            {sortedData.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString()
                    : "-"}
                </td>

                <td>{item.profile}</td>
                <td>{item.edge_rtt_ms?.toFixed(2)}</td>
                <td>{item.cloud_rtt_ms?.toFixed(2)}</td>
                <td>{item.edge_cpu?.toFixed(2)}</td>
                <td>{item.cloud_cpu?.toFixed(2)}</td>
                <td>{item.payload_bytes}</td>
                <td>{item.edge_ok ? "✅" : "❌"}</td>
                <td>{item.cloud_ok ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
