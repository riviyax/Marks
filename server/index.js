const express = require("express");
const dbConnection = require("./config/db");
const router = require("./routes/members");
const cors = require("cors");
const bodyParser = require("body-parser");

const LastUpdate = require("./models/LastUpdate");

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
dbConnection();

// ========== ROUTES ==========

// GET last update from MongoDB
app.get("/api/last-update", async (req, res) => {
  try {
    let doc = await LastUpdate.findOne();

    // If not exists, create with current date
    if (!doc) {
      doc = await LastUpdate.create({});
    }

    res.json({ lastUpdated: doc.lastUpdated });
  } catch (err) {
    console.error("GET /api/last-update error:", err);
    res.status(500).json({ error: "Failed to fetch last updated date" });
  }
});

// POST to update last update date
app.post("/api/last-update", async (req, res) => {
  try {
    const customDate = req.body.date;

    let newDate = new Date();
    if (customDate) {
      const parsed = new Date(customDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      newDate = parsed;
    }

    let doc = await LastUpdate.findOne();
    if (!doc) {
      doc = await LastUpdate.create({ lastUpdated: newDate });
    } else {
      doc.lastUpdated = newDate;
      await doc.save();
    }

    res.json({ lastUpdated: doc.lastUpdated });
  } catch (err) {
    console.error("POST /api/last-update error:", err);
    res.status(500).json({ error: "Failed to update last updated date" });
  }
});

// Main homepage
app.get("/", (req, res) => {
  res.send(
    '<h1>Hello World!</h1><br>v2 This is the server side website for the Members API<br><a href="">Go To Main Site</a><br><a target="_blank" href="https://ggriviya.pages.dev">Go To Developer Page</a>'
  );
});

// Member routes
app.use("/api/members", router);

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on https://marks.vercel.app/`);
});
