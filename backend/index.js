const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve frontend static files from ../frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend" });
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
