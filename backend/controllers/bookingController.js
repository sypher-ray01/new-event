const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Booking = require("../models/Booking");
const Event = require("../models/Event");

function buildSelectedTickets(payload) {
  if (Array.isArray(payload.selectedTickets) && payload.selectedTickets.length > 0) {
    return payload.selectedTickets;
  }

  if (Array.isArray(payload.tickets) && payload.tickets.length > 0) {
    return payload.tickets;
  }

  return [];
}

const createBooking = asyncHandler(async (req, res) => {
  const { eventId, userName, userEmail, userPhone } = req.body;
  const selectedTickets = buildSelectedTickets(req.body);

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "Event ID is required"
    });
  }

  if (!selectedTickets.length) {
    return res.status(400).json({
      success: false,
      message: "At least one ticket must be selected"
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new Error("Event not found");
    }

    const bookingTickets = [];
    let subtotal = 0;
    let totalCount = 0;

    selectedTickets.forEach((selectedTicket) => {
      const ticketName = selectedTicket.ticketType || selectedTicket.type || selectedTicket.name;
      const quantity = Number(selectedTicket.quantity || 0);
      const ticket = event.tickets.find((item) => item.type === ticketName);

      if (!ticket) {
        throw new Error(`Ticket type not found: ${ticketName}`);
      }

      if (quantity <= 0) {
        return;
      }

      const available = ticket.quantity - ticket.sold;
      if (available < quantity) {
        throw new Error(`Not enough availability for ${ticket.type}`);
      }

      ticket.sold += quantity;
      subtotal += ticket.price * quantity;
      totalCount += quantity;
      bookingTickets.push({
        ticketType: ticket.type,
        quantity,
        unitPrice: ticket.price
      });
    });

    if (!bookingTickets.length) {
      throw new Error("Please select at least one ticket");
    }

    let discount = 0;
    if (event.groupBooking.enabled && totalCount >= event.groupBooking.minSize) {
      discount = subtotal * (event.groupBooking.discount / 100);
    }

    const booking = await Booking.create(
      [
        {
          event: event._id,
          user: req.user._id,
          userName: userName || req.user.name,
          userEmail: userEmail || req.user.email,
          userPhone,
          tickets: bookingTickets,
          subtotal,
          discount,
          total: subtotal - discount
        }
      ],
      { session }
    );

    await event.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking[0]
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400);
    throw error;
  } finally {
    session.endSession();
  }
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    user: req.user._id,
    status: "confirmed"
  })
    .populate("event", "title startDate endDate venue")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: bookings.map((booking) => ({
      _id: booking._id,
      eventId: booking.event?._id,
      eventTitle: booking.event?.title || "Unknown Event",
      bookingDate: booking.bookingDate,
      total: booking.total,
      status: booking.status,
      tickets: booking.tickets,
      event: booking.event
    }))
  });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.id).session(session);
    if (!booking || booking.status !== "confirmed") {
      throw new Error("Booking not found");
    }

    if (String(booking.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this booking"
      });
    }

    const event = await Event.findById(booking.event).session(session);
    if (!event) {
      throw new Error("Associated event not found");
    }

    booking.tickets.forEach((bookedTicket) => {
      const eventTicket = event.tickets.find((ticket) => ticket.type === bookedTicket.ticketType);
      if (eventTicket) {
        eventTicket.sold = Math.max(0, eventTicket.sold - bookedTicket.quantity);
      }
    });

    booking.status = "cancelled";
    await booking.save({ session });
    await event.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400);
    throw error;
  } finally {
    session.endSession();
  }
});

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking
};
