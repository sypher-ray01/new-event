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
    // First read: get event data for validation and pricing (read-only)
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new Error("Event not found");
    }

    const bookingTickets = [];
    let subtotal = 0;
    let totalCount = 0;
    const ticketIncrements = [];

    // Validate and prepare ticket data (no writes yet)
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

      subtotal += ticket.price * quantity;
      totalCount += quantity;
      bookingTickets.push({
        ticketType: ticket.type,
        quantity,
        unitPrice: ticket.price
      });
      ticketIncrements.push({ ticketName: ticket.type, quantity, maxSold: ticket.quantity - quantity });
    });

    if (!bookingTickets.length) {
      throw new Error("Please select at least one ticket");
    }

    // ATOMIC: decrement tickets one type at a time using findOneAndUpdate.
    // Each operation checks availability and decrements in a single atomic step.
    // If any returns null, the ticket was already taken (lost the race).
    for (const { ticketName, quantity, maxSold } of ticketIncrements) {
      const updated = await Event.findOneAndUpdate(
        {
          _id: eventId,
          tickets: {
            $elemMatch: {
              type: ticketName,
              sold: { $lte: maxSold }
            }
          }
        },
        {
          $inc: { "tickets.$.sold": quantity }
        },
        {
          new: true,
          session,
          runValidators: true
        }
      );

      if (!updated) {
        throw new Error(`Not enough availability for ${ticketName}. Please try again.`);
      }
    }

    // Read the final event state for group booking calculation
    const updatedEvent = await Event.findById(eventId).session(session);

    let discount = 0;
    if (updatedEvent.groupBooking.enabled && totalCount >= updatedEvent.groupBooking.minSize) {
      discount = subtotal * (updatedEvent.groupBooking.discount / 100);
    }

    const booking = await Booking.create(
      [
        {
          event: updatedEvent._id,
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

    // ATOMIC: restore ticket counts using findOneAndUpdate + $inc per ticket type
    for (const bookedTicket of booking.tickets) {
      await Event.findOneAndUpdate(
        {
          _id: booking.event,
          tickets: {
            $elemMatch: {
              type: bookedTicket.ticketType,
              sold: { $gte: bookedTicket.quantity }
            }
          }
        },
        {
          $inc: { "tickets.$.sold": -bookedTicket.quantity }
        },
        {
          session,
          runValidators: true
        }
      );
    }

    booking.status = "cancelled";
    await booking.save({ session });
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
