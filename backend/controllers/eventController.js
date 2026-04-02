const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const buildEventQuery = require("../utils/buildEventQuery");
const { normalizeEvent } = require("../utils/serializers");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

function normalizeIncomingEvent(body) {
  const venue = body.venue || {};
  const location = body.location || "";
  const address = body.address || "";
  const addressParts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const parsedTickets = (body.tickets || []).map((ticket) => ({
    type: ticket.type || ticket.name,
    price: Number(ticket.price || 0),
    quantity: Number(ticket.quantity || 0),
    sold: Number(ticket.sold || 0)
  }));

  const parsedVendors = (body.vendors || []).map((vendor) => ({
    type: vendor.type || vendor.description || "vendor",
    name: vendor.name,
    contact: vendor.contact
  }));

  return {
    title: body.title,
    category: body.category,
    description: body.description,
    startDate: body.startDate,
    endDate: body.endDate,
    venue: {
      name: venue.name || location,
      address: venue.address || addressParts[0] || location,
      city: venue.city || addressParts[1] || "Unknown",
      state: venue.state || addressParts[2] || "Unknown"
    },
    price: Number(body.price || 0),
    tickets: parsedTickets,
    vendors: parsedVendors,
    groupBooking: {
      enabled: Boolean(body.groupBooking?.enabled),
      minSize: Number(body.groupBooking?.minSize || 5),
      discount: Number(body.groupBooking?.discount || 10)
    },
    status: body.status || "published"
  };
}

function ensureOwnership(event, user) {
  return user.role === "admin" || String(event.organizer) === String(user._id);
}

const getEvents = asyncHandler(async (req, res) => {
  const filters = buildEventQuery(req.query);
  const events = await Event.aggregate([
    { $match: filters },
    {
      $lookup: {
        from: "bookings",
        let: { eventId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$event", "$$eventId"] },
                  { $eq: ["$status", "confirmed"] }
                ]
              }
            }
          }
        ],
        as: "attendees"
      }
    },
    { $sort: { startDate: 1, createdAt: -1 } }
  ]);

  res.status(200).json({
    success: true,
    total: events.length,
    data: events.map(normalizeEvent)
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $lookup: {
        from: "bookings",
        let: { eventId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$event", "$$eventId"] },
                  { $eq: ["$status", "confirmed"] }
                ]
              }
            }
          }
        ],
        as: "attendees"
      }
    }
  ]);

  if (!event.length) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  res.status(200).json({
    success: true,
    data: normalizeEvent(event[0])
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const payload = normalizeIncomingEvent(req.body);
  const event = await Event.create({
    ...payload,
    organizer: req.user._id
  });

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    data: normalizeEvent(event)
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  if (!ensureOwnership(event, req.user)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to update this event"
    });
  }

  Object.assign(event, normalizeIncomingEvent(req.body));
  await event.save();

  res.status(200).json({
    success: true,
    message: "Event updated successfully",
    data: normalizeEvent(event)
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  if (!ensureOwnership(event, req.user)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to delete this event"
    });
  }

  await Booking.deleteMany({ event: event._id });
  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: "Event deleted successfully"
  });
});

const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.aggregate([
    {
      $match: {
        organizer: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "bookings",
        let: { eventId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$event", "$$eventId"] },
                  { $eq: ["$status", "confirmed"] }
                ]
              }
            }
          }
        ],
        as: "attendees"
      }
    },
    { $sort: { createdAt: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: events.map(normalizeEvent)
  });
});

const getEventAttendees = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found"
    });
  }

  if (!ensureOwnership(event, req.user)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to view attendees for this event"
    });
  }

  const bookings = await Booking.find({
    event: event._id,
    status: "confirmed"
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total: bookings.length,
    data: bookings.map((booking) => ({
      _id: booking._id,
      name: booking.userName,
      email: booking.userEmail,
      phone: booking.userPhone,
      bookingDate: booking.bookingDate,
      tickets: booking.tickets,
      total: booking.total,
      checkedIn: false,
      status: booking.status
    }))
  });
});

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventAttendees
};
