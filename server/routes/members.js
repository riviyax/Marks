const express = require("express");
const router = express.Router();
const Members = require("../models/members");

//test
router.get("/test", (req, res) => res.send("Members route testing!"));

router.post("/", (req, res) => {
  Members.create(req.body)
    .then((member) => res.json({ msg: "Member added successfully" }))
    .catch((err) =>
      res.status(400).json({ error: "Unable to add this member" })
    );
});

router.get("/", (req, res) => {
  Members.find()
    .then((members) => res.json(members))
    .catch((err) => res.status(400).json({ error: "Unable to fetch members" }));
});

router.get("/:id", (req, res) => {
  Members.findById(req.params.id)
    .then((member) => res.json(member))
    .catch((err) => res.status(400).json({ error: "Unable to fetch member" }));
});

router.put("/:id", (req, res) => {
  Members.findByIdAndUpdate(req.params.id, req.body)
    .then((member) => res.json({ msg: "Member updated successfully" }))
    .catch((err) =>
      res.status(400).json({ error: "Unable to update the Database" })
    );

    
});

router.delete("/:id", (req, res) => {
  Members.findByIdAndDelete(req.params.id, req.body)
    .then((member) => res.json({ msg: "Member deleted successfully" }))
    .catch((err) => res.status(400).json({ error: "Unable to delete this member" }));
});

module.exports = router;
