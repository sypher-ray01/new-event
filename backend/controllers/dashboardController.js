const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/Event");

const getSummary = asyncHandler(async (req, res) => {
  const summary = await Event.aggregate([
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
        as: "confirmedBookings"
      }
    },
    {
      $project: {
        eventCount: { $literal: 1 },
        bookingCount: { $size: "$confirmedBookings" },
        attendeeCount: { $size: "$confirmedBookings" },
        revenue: { $sum: "$confirmedBookings.total" }
      }
    },
    {
      $group: {
        _id: null,
        eventsCount: { $sum: "$eventCount" },
        bookingsCount: { $sum: "$bookingCount" },
        attendeesCount: { $sum: "$attendeeCount" },
        revenue: { $sum: "$revenue" }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data:
      summary[0] || {
        eventsCount: 0,
        bookingsCount: 0,
        attendeesCount: 0,
        revenue: 0
      }
  });
});

module.exports = {
  getSummary
};
