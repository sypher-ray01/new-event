const express = require("express");
const protect = require("../middleware/auth");
const {
  getReminders,
  createReminder,
  deleteReminder
} = require("../controllers/reminderController");

const router = express.Router();

router.use(protect);
router.get("/", getReminders);
router.post("/", createReminder);
router.delete("/:id", deleteReminder);

module.exports = router;
