function normalizeEvent(eventDoc) {
  const event = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  const attendeesCount = Array.isArray(event.attendees)
    ? event.attendees.length
    : typeof event.attendeesCount === "number"
      ? event.attendeesCount
      : 0;

  return {
    ...event,
    location: event.venue?.name || "",
    address:
      event.venue?.address && event.venue?.city && event.venue?.state
        ? `${event.venue.address}, ${event.venue.city}, ${event.venue.state}`
        : event.venue?.address || "",
    attendees: Array.from({ length: attendeesCount }, (_, index) => ({
      id: `${event._id || event.id}-attendee-${index + 1}`
    })),
    attendeesCount
  };
}

module.exports = {
  normalizeEvent
};
