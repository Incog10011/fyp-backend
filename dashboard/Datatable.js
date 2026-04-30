import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "experiment_results"),
      (snapshot) => {
        setData(snapshot.docs.map(doc => doc.data()));
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Edge vs Cloud Benchmark Dashboard</h1>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Profile</th>
            <th>Edge RTT (ms)</th>
            <th>Cloud RTT (ms)</th>
            <th>Payload (bytes)</th>
            <th>Edge OK</th>
            <th>Cloud OK</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.timestamp}</td>
              <td>{item.profile}</td>
              <td>{item.edge_rtt_ms}</td>
              <td>{item.cloud_rtt_ms}</td>
              <td>{item.payload_bytes}</td>
              <td>{item.edge_ok ? "✅" : "❌"}</td>
              <td>{item.cloud_ok ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
