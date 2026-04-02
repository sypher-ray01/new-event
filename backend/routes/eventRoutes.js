const express = require("express");
const protect = require("../middleware/auth");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventAttendees
} = require("../controllers/eventController");
const { createBooking } = require("../controllers/bookingController");

const router = express.Router();

router.get("/", getEvents);
router.get("/my/events", protect, getMyEvents);
router.get("/:id", getEventById);
router.get("/:id/attendees", protect, getEventAttendees);
router.post("/", protect, createEvent);
router.put("/:id", protect, updateEvent);
router.delete("/:id", protect, deleteEvent);
router.post("/:id/register", protect, (req, res, next) => {
  req.body.eventId = req.params.id;
  return createBooking(req, res, next);
});

module.exports = router;
