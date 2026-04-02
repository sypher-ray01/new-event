const asyncHandler = require("../utils/asyncHandler");
const Reminder = require("../models/Reminder");
const Event = require("../models/Event");

const getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({
    user: req.user._id,
    status: { $ne: "cancelled" }
  })
    .populate("event", "title startDate")
    .sort({ remindAt: 1 });

  res.status(200).json({
    success: true,
    data: reminders.map((reminder) => ({
      _id: reminder._id,
      eventId: reminder.event?._id,
      eventTitle: reminder.event?.title || "Unknown Event",
      eventDate: reminder.event?.startDate,
      remindAt: reminder.remindAt,
      message: reminder.message,
      status: reminder.status
    }))
  });
});

const createReminder = asyncHandler(async (req, res) => {
  const { eventId, remindAt, message } = req.body;
  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  const reminder = await Reminder.create({
    user: req.user._id,
    event: eventId,
    remindAt,
    message
  });

  res.status(201).json({
    success: true,
    message: "Reminder created successfully",
    data: {
      _id: reminder._id,
      eventId,
      eventTitle: event.title,
      eventDate: event.startDate,
      remindAt: reminder.remindAt,
      message: reminder.message,
      status: reminder.status
    }
  });
});

const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return res.status(404).json({
      success: false,
      message: "Reminder not found"
    });
  }

  if (String(reminder.user) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to delete this reminder"
    });
  }

  reminder.status = "cancelled";
  await reminder.save();

  res.status(200).json({
    success: true,
    message: "Reminder deleted successfully"
  });
});

module.exports = {
  getReminders,
  createReminder,
  deleteReminder
};
