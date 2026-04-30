const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
  origin: "*",
}));
app.use(express.json());

app.get("/ping-edge", (req, res) => {
  res.json({ ok: true });
});

app.get("/ping-cloud", async (req, res) => {
  await new Promise(r => setTimeout(r, 80));
  res.json({ ok: true });
});

app.post("/process", (req, res) => {
  const start = Date.now();

  for (let i = 0; i < 5e7; i++) {
    Math.sqrt(i);
  }

  res.json({ cpu_time_ms: Date.now() - start });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
