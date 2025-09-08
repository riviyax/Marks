const express = require("express");
const dbConnection = require("./config/db");
const router = require("./routes/members");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors({ origin: true, credentials: true }));

dbConnection();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to lastUpdate.json
const lastUpdatePath = path.join(__dirname, "lastUpdate.json");

// Ensure file exists
if (!fs.existsSync(lastUpdatePath)) {
  fs.writeFileSync(
    lastUpdatePath,
    JSON.stringify({ lastUpdated: null }, null, 2)
  );
}

// GET last update
app.get("/api/last-update", (req, res) => {
  const data = JSON.parse(fs.readFileSync(lastUpdatePath, "utf8"));
  res.json(data);
});

// POST last update (manual or auto)
app.post("/api/last-update", (req, res) => {
  const customDate = req.body.date; // optional
  const update = {
    lastUpdated: customDate
      ? new Date(customDate).toISOString()
      : new Date().toISOString(),
  };
  fs.writeFileSync(lastUpdatePath, JSON.stringify(update, null, 2));
  res.json(update);
});

app.get("/", (req, res) => {
  res.send(
    '<h1>Hello World!</h1><br>This is the server side website for the Members API<br><a href="">Go To Main Site</a><br><a target="_blank" href="https://ggriviya.pages.dev">Go To Developer Page</a>'
  );
});

app.use("/api/members", router);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
