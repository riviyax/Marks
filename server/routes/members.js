const express = require("express");
const router = express.Router();
const Members = require("../models/members");

// Test route
router.get("/test", (req, res) => res.send("Members route testing!"));

// POST - Add new member
router.post("/", (req, res) => {
  Members.create(req.body)
    .then((member) => res.json({ msg: "Member added successfully" }))
    .catch((err) =>
      res.status(400).json({ error: "Unable to add this member" })
    );
});

// GET - Fetch all members
router.get("/", (req, res) => {
  Members.find()
    .then((members) => res.json(members))
    .catch((err) => res.status(400).json({ error: "Unable to fetch members" }));
});

// GET - Fetch single member by ID
router.get("/:id", (req, res) => {
  Members.findById(req.params.id)
    .then((member) => res.json(member))
    .catch((err) => res.status(400).json({ error: "Unable to fetch member" }));
});

// PUT - Update member (including whatsappNumber)
router.put("/:id", (req, res) => {
  Members.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((member) => res.json({ msg: "Member updated successfully", member }))
    .catch((err) =>
      res.status(400).json({ error: "Unable to update the Database" })
    );
});

// DELETE - Remove member
router.delete("/:id", (req, res) => {
  Members.findByIdAndDelete(req.params.id)
    .then((member) => res.json({ msg: "Member deleted successfully" }))
    .catch((err) =>
      res.status(400).json({ error: "Unable to delete this member" })
    );
});

// PATCH - Update only whatsapp number
router.patch("/:id/whatsapp", (req, res) => {
  const { whatsappNumber } = req.body;

  if (!whatsappNumber) {
    return res.status(400).json({ error: "whatsappNumber is required" });
  }

  // Strip any + or spaces, ensure it's digits only
  const cleaned = whatsappNumber.replace(/\D/g, "");

  Members.findByIdAndUpdate(
    req.params.id,
    { whatsappNumber: cleaned },
    { new: true }
  )
    .then((member) =>
      res.json({ msg: "WhatsApp number updated successfully", member })
    )
    .catch((err) =>
      res.status(400).json({ error: "Unable to update WhatsApp number" })
    );
});

module.exports = router;