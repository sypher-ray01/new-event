(function initStandaloneEventHub() {
  if (window.EventHubStandaloneLoaded) return;
  window.EventHubStandaloneLoaded = true;

  const page = document.body ? document.body.dataset.page : "";
  if (!page || !window.API) return;

  const state = {
    events: [],
    bookings: [],
    reminders: [],
    attendeeEventId: null
  };

  function escapeHtml(str) {
    const value = String(str == null ? '' : str);
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSharedUi();

    if (page === "events") initEventsPage();
    if (page === "create") initCreatePage();
    if (page === "dashboard") initDashboardPage();
  });

  function bindSharedUi() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
      if (window.API.isAuthenticated()) {
        const user = window.API.getCurrentUser();
        loginBtn.textContent = user ? `Hi, ${user.name.split(" ")[0]}` : "Dashboard";
      }
      loginBtn.addEventListener("click", () => {
        window.location.href = window.API.isAuthenticated() ? "dashboard.html" : "login.html";
      });
    }

    bindClick("notificationBtn", toggleNotificationPanel);
    bindClick("closeNotificationPanel", toggleNotificationPanel);
    bindClick("closeModal", () => closeModal("eventModal"));
    bindClick("closeBookingModal", () => closeModal("bookingModal"));
    bindClick("closeReminderModal", () => closeModal("reminderModal"));

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll();
  }

  function bindClick(id, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener("click", handler);
  }

  async function initEventsPage() {
    bindClick("applyFilters", loadEventsFromFilters);
    bindClick("resetFilters", () => {
      ["categoryFilter", "startDate", "endDate", "locationFilter", "minPrice", "maxPrice"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = "";
      });
      loadEventsFromFilters();
    });

    await loadEventsFromFilters();
  }

  function initCreatePage() {
    bindClick("addTicketType", addTicketType);
    bindClick("addVendor", addVendor);

    const groupBookingCheckbox = document.getElementById("enableGroupBooking");
    if (groupBookingCheckbox) {
      groupBookingCheckbox.addEventListener("change", (event) => {
        const options = document.getElementById("groupBookingOptions");
        if (options) options.style.display = event.target.checked ? "block" : "none";
      });
    }

    if (document.querySelectorAll(".ticket-type").length === 0) addTicketType();
    if (document.querySelectorAll(".vendor-item").length === 0) addVendor();

    const form = document.getElementById("createEventForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!window.API.isAuthenticated()) {
        showNotification("error", "Please login to create an event");
        window.location.href = "login.html";
        return;
      }

      const payload = {
        title: valueOf("eventTitle"),
        category: valueOf("eventCategory"),
        description: valueOf("eventDescription"),
        startDate: toIso("eventStartDate"),
        endDate: toIso("eventEndDate"),
        venue: {
          name: valueOf("venueName"),
          address: valueOf("venueAddress"),
          city: valueOf("venueCity"),
          state: valueOf("venueState")
        },
        tickets: Array.from(document.querySelectorAll(".ticket-type"))
          .map((ticket) => ({
            type: ticket.querySelector(".ticketName").value.trim(),
            price: Number(ticket.querySelector(".ticketPrice").value || 0),
            quantity: Number(ticket.querySelector(".ticketQuantity").value || 0),
            sold: 0
          }))
          .filter((ticket) => ticket.type && ticket.quantity > 0),
        vendors: Array.from(document.querySelectorAll(".vendor-item"))
          .map((vendor) => ({
            type: vendor.querySelector(".vendorType").value,
            name: vendor.querySelector(".vendorName").value.trim(),
            contact: vendor.querySelector(".vendorContact").value.trim()
          }))
          .filter((vendor) => vendor.type && vendor.name && vendor.contact),
        groupBooking: {
          enabled: Boolean(document.getElementById("enableGroupBooking")?.checked),
          minSize: Number(valueOf("groupMinSize") || 5),
          discount: Number(valueOf("groupDiscount") || 10)
        }
      };

      payload.price = payload.tickets.length ? Math.min(...payload.tickets.map((ticket) => ticket.price)) : 0;

      try {
        await window.API.events.create(payload);
        showNotification("success", "Event created successfully");
        form.reset();
        const options = document.getElementById("groupBookingOptions");
        if (options) options.style.display = "none";
        setTimeout(() => {
          window.location.href = "events.html";
        }, 800);
      } catch (error) {
        showNotification("error", error.message || "Failed to create event");
      }
    });
  }

  async function initDashboardPage() {
    if (!window.API.isAuthenticated()) {
      showNotification("error", "Please login to view the dashboard");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
      return;
    }

    document.querySelectorAll(".tab-btn").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    bindClick("addReminderBtn", openReminderModal);

    const reminderForm = document.getElementById("reminderForm");
    if (reminderForm) {
      reminderForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await createReminder();
      });
    }

    await loadDashboardData();
  }

  async function loadEventsFromFilters() {
    try {
      const response = await window.API.events.getAll({
        category: valueOf("categoryFilter"),
        startDate: valueOf("startDate"),
        endDate: valueOf("endDate"),
        location: valueOf("locationFilter"),
        minPrice: valueOf("minPrice"),
        maxPrice: valueOf("maxPrice"),
        status: "published"
      });
      state.events = response.data || [];
      renderEvents();
    } catch (error) {
      showNotification("error", error.message || "Failed to load events");
    }
  }

  function renderEvents() {
    const grid = document.getElementById("eventsGrid");
    if (!grid) return;

    if (!state.events.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">No events found.</div>';
      return;
    }

    grid.innerHTML = state.events.map((event) => {
      const attendees = event.attendeesCount || (Array.isArray(event.attendees) ? event.attendees.length : 0);
      return `
        <div class="event-card" onclick="openEventDetail('${escapeHtml(event._id)}')">
          <div class="event-image"><i class="fas ${getCategoryIcon(event.category)}"></i></div>
          <div class="event-content">
            <span class="event-category">${escapeHtml(formatCategory(event.category))}</span>
            <h3 class="event-title">${escapeHtml(event.title)}</h3>
            <div class="event-meta">
              <div class="event-meta-item"><i class="fas fa-calendar"></i><span>${escapeHtml(formatDate(event.startDate))}</span></div>
              <div class="event-meta-item"><i class="fas fa-clock"></i><span>${escapeHtml(formatTime(event.startDate))}</span></div>
              <div class="event-meta-item"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(event.venue.city)}</span></div>
              <div class="event-meta-item"><i class="fas fa-users"></i><span>${attendees} attendees</span></div>
            </div>
            <div class="event-footer">
              <span class="event-price">₹${Number(event.price || 0)}</span>
              <button class="btn-book" onclick="event.stopPropagation(); openBookingModal('${escapeHtml(event._id)}')">Book Now</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  async function loadDashboardData() {
    try {
      const [eventsResponse, bookingsResponse, remindersResponse, summaryResponse] = await Promise.all([
        window.API.events.getMyEvents(),
        window.API.bookings.getMy(),
        window.API.reminders.getAll(),
        window.API.dashboard.getSummary()
      ]);

      state.events = eventsResponse.data || [];
      state.bookings = bookingsResponse.data || [];
      state.reminders = remindersResponse.data || [];

      renderDashboardEvents();
      renderBookings();
      renderReminders();
      renderSummary(summaryResponse.data || {});

      if (state.events.length) {
        state.attendeeEventId = state.events[0]._id;
        await loadAttendees(state.attendeeEventId);
      } else {
        renderAttendees([]);
      }
    } catch (error) {
      showNotification("error", error.message || "Failed to load dashboard");
    }
  }

  function renderDashboardEvents() {
    const container = document.getElementById("dashboardEvents");
    if (!container) return;

    if (!state.events.length) {
      container.innerHTML = '<p style="text-align: center; padding: 2rem;">You have not created any events yet.</p>';
      return;
    }

    container.innerHTML = state.events.map((event) => {
      const attendees = event.attendeesCount || (Array.isArray(event.attendees) ? event.attendees.length : 0);
      const revenue = (event.tickets || []).reduce((sum, ticket) => sum + ticket.price * ticket.sold, 0);
      return `
        <div class="dashboard-event-card">
          <div class="dashboard-event-info">
            <h3>${escapeHtml(event.title)}</h3>
            <p>${escapeHtml(formatDateTime(event.startDate))}</p>
            <div class="dashboard-event-stats">
              <span><i class="fas fa-users"></i> ${attendees}</span>
              <span><i class="fas fa-indian-rupee-sign"></i> ${revenue.toFixed(2)}</span>
            </div>
          </div>
          <div class="dashboard-event-actions">
            <button class="btn-action" onclick="openEventDetail('${escapeHtml(event._id)}')">View</button>
            <button class="btn-action" onclick="showAttendees('${escapeHtml(event._id)}')">Attendees</button>
            <button class="btn-action btn-danger" onclick="deleteEvent('${escapeHtml(event._id)}')">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderBookings() {
    const container = document.getElementById("bookingsList");
    if (!container) return;

    if (!state.bookings.length) {
      container.innerHTML = '<p style="text-align: center; padding: 2rem;">No bookings yet.</p>';
      return;
    }

    container.innerHTML = state.bookings.map((booking) => `
      <div class="booking-card">
        <div class="booking-card-header">
          <h3>${escapeHtml(booking.eventTitle)}</h3>
          <span class="booking-status confirmed">${escapeHtml(booking.status)}</span>
        </div>
        <div class="booking-details">
          <p>Booked on: ${escapeHtml(formatDate(booking.bookingDate))}</p>
          <p>Total: ₹${Number(booking.total || 0).toFixed(2)}</p>
        </div>
        <button class="btn-action btn-danger" onclick="cancelBooking('${escapeHtml(booking._id)}')">Cancel</button>
      </div>
    `).join("");
  }

  function renderReminders() {
    const container = document.getElementById("remindersList");
    if (!container) return;

    if (!state.reminders.length) {
      container.innerHTML = '<p style="text-align: center;">No reminders set.</p>';
      return;
    }

    container.innerHTML = state.reminders.map((reminder) => `
      <div class="reminder-item">
        <div class="reminder-header">
          <div class="reminder-title">${escapeHtml(reminder.eventTitle)}</div>
          <button class="btn-delete-reminder" onclick="deleteReminder('${escapeHtml(reminder._id)}')"><i class="fas fa-trash"></i></button>
        </div>
        <div class="reminder-message">${escapeHtml(reminder.message)}</div>
        <small>${escapeHtml(formatDateTime(reminder.remindAt))}</small>
      </div>
    `).join("");
  }

  async function loadAttendees(eventId) {
    try {
      const response = await window.API.events.getAttendees(eventId);
      renderAttendees(response.data || []);
    } catch (error) {
      renderAttendees([]);
      showNotification("error", error.message || "Failed to load attendees");
    }
  }

  function renderAttendees(attendees) {
    const container = document.getElementById("attendeesList");
    if (!container) return;

    const totalEl = document.getElementById("totalAttendees");
    const checkedInEl = document.getElementById("checkedIn");
    const pendingEl = document.getElementById("pending");

    if (totalEl) totalEl.textContent = attendees.length;
    if (checkedInEl) checkedInEl.textContent = attendees.filter((attendee) => attendee.checkedIn).length;
    if (pendingEl) pendingEl.textContent = attendees.filter((attendee) => !attendee.checkedIn).length;

    if (!attendees.length) {
      container.innerHTML = "<p style='padding:1rem;'>No attendees found for this event yet.</p>";
      return;
    }

    container.innerHTML = attendees.map((attendee) => `
      <div class="booking-card">
        <div class="booking-card-header">
          <h3>${escapeHtml(attendee.name)}</h3>
          <span class="booking-status confirmed">${escapeHtml(attendee.status)}</span>
        </div>
        <div class="booking-details">
          <p>Email: ${escapeHtml(attendee.email)}</p>
          <p>Phone: ${escapeHtml(attendee.phone)}</p>
          <p>Booked: ${escapeHtml(formatDate(attendee.bookingDate))}</p>
        </div>
      </div>
    `).join("");
  }

  function renderSummary(summary) {
    const summaryMap = {
      totalEvents: summary.eventsCount,
      totalBookings: summary.bookingsCount,
      totalAttendeesOverview: summary.attendeesCount,
      totalRevenue: `₹${Number(summary.revenue || 0).toFixed(2)}`
    };

    Object.entries(summaryMap).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  async function createReminder() {
    try {
      await window.API.reminders.create({
        eventId: valueOf("reminderEvent"),
        remindAt: toIso("reminderDateTime"),
        message: valueOf("reminderMessage")
      });
      closeModal("reminderModal");
      document.getElementById("reminderForm").reset();
      showNotification("success", "Reminder created");
      const response = await window.API.reminders.getAll();
      state.reminders = response.data || [];
      renderReminders();
    } catch (error) {
      showNotification("error", error.message || "Failed to create reminder");
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);
    if (activeBtn) activeBtn.classList.add("active");
    if (activeContent) activeContent.classList.add("active");
  }

  function addTicketType() {
    const container = document.getElementById("ticketTypes");
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.className = "ticket-type";
    wrapper.innerHTML = `
      <div class="form-row">
        <div class="form-group"><label>Type</label><input type="text" class="ticketName" placeholder="e.g. General Admission" required></div>
        <div class="form-group"><label>Price</label><input type="number" class="ticketPrice" min="0" step="0.01" required></div>
        <div class="form-group"><label>Qty</label><input type="number" class="ticketQuantity" min="1" required></div>
        <button type="button" class="btn-remove-ticket" onclick="this.closest('.ticket-type').remove()"><i class="fas fa-trash"></i></button>
      </div>
    `;
    container.appendChild(wrapper);
  }

  function addVendor() {
    const container = document.getElementById("vendorList");
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.className = "vendor-item";
    wrapper.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>Type</label>
          <select class="vendorType" required>
            <option value="catering">Catering</option>
            <option value="photography">Photography</option>
            <option value="audio">Audio</option>
            <option value="security">Security</option>
            <option value="decoration">Decoration</option>
          </select>
        </div>
        <div class="form-group"><label>Name</label><input type="text" class="vendorName" required></div>
        <div class="form-group"><label>Contact</label><input type="text" class="vendorContact" required></div>
        <button type="button" class="btn-remove-vendor" onclick="this.closest('.vendor-item').remove()"><i class="fas fa-trash"></i></button>
      </div>
    `;
    container.appendChild(wrapper);
  }

  async function openReminderModal() {
    const modal = document.getElementById("reminderModal");
    const select = document.getElementById("reminderEvent");
    if (!modal || !select) return;

    const combinedEvents = [
      ...state.events,
      ...state.bookings
        .filter((booking) => booking.event)
        .map((booking) => ({
          _id: booking.event._id,
          title: booking.event.title || booking.eventTitle
        }))
    ];

    const seen = new Set();
    const uniqueEvents = combinedEvents.filter((event) => {
      if (!event || !event._id || seen.has(String(event._id))) return false;
      seen.add(String(event._id));
      return true;
    });

    select.innerHTML =
      '<option value="">Select Event</option>' +
      uniqueEvents.map((event) => `<option value="${escapeHtml(event._id)}">${escapeHtml(event.title)}</option>`).join("");
    modal.classList.add("active");
  }

  async function openEventDetail(eventId) {
    try {
      const response = await window.API.events.getById(eventId);
      const event = response.data;
      const modal = document.getElementById("eventModal");
      const content = document.getElementById("eventDetailContent");
      if (!modal || !content) return;

      content.innerHTML = `
        <div class="event-detail-header">
          <span class="event-category">${escapeHtml(formatCategory(event.category))}</span>
          <h2 class="event-detail-title">${escapeHtml(event.title)}</h2>
          <p>${escapeHtml(event.description)}</p>
        </div>
        <div class="event-detail-section">
          <h3><i class="fas fa-calendar-alt"></i> Date & Time</h3>
          <p><strong>Start:</strong> ${escapeHtml(formatDateTime(event.startDate))}</p>
          <p><strong>End:</strong> ${escapeHtml(formatDateTime(event.endDate))}</p>
        </div>
        <div class="event-detail-section">
          <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
          <p><strong>${escapeHtml(event.venue.name)}</strong></p>
          <p>${escapeHtml(event.venue.address)}</p>
          <p>${escapeHtml(event.venue.city)}, ${escapeHtml(event.venue.state)}</p>
        </div>
        <div class="event-detail-section">
          <h3><i class="fas fa-ticket-alt"></i> Tickets Available</h3>
          <div class="ticket-options">
            ${(event.tickets || []).map((ticket) => `
              <div class="ticket-option">
                <div>
                  <strong>${escapeHtml(ticket.type)}</strong>
                  <p>₹${ticket.price} • ${ticket.quantity - ticket.sold} remaining</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
          <button class="btn-submit" onclick="openBookingModal('${escapeHtml(event._id)}')">Book Tickets</button>
          <button class="btn-action" onclick="shareEvent('${escapeHtml(event._id)}')"><i class="fas fa-share-alt"></i> Share</button>
        </div>
      `;
      modal.classList.add("active");
    } catch (error) {
      showNotification("error", error.message || "Failed to load event");
    }
  }

  async function openBookingModal(eventId) {
    try {
      const response = await window.API.events.getById(eventId);
      const event = response.data;
      const user = window.API.getCurrentUser() || {};

      closeModal("eventModal");

      const modal = document.getElementById("bookingModal");
      const content = document.getElementById("bookingContent");
      if (!modal || !content) return;

      content.innerHTML = `
        <h3>${escapeHtml(event.title)}</h3>
        <p style="color: var(--dark-alt); margin-bottom: 1.5rem;">${escapeHtml(formatDateTime(event.startDate))}</p>
        <input type="hidden" id="bookingEventId" value="${escapeHtml(event._id)}">
        <div class="form-group">
          <label>Select Tickets</label>
          ${(event.tickets || []).map((ticket, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 0.5rem;">
              <div><strong>${escapeHtml(ticket.type)}</strong><p>₹${ticket.price}</p></div>
              <input type="number" id="ticket_${index}" data-ticket-type="${escapeHtml(ticket.type)}" data-ticket-price="${ticket.price}" data-ticket-minsize="${event.groupBooking?.minSize || 5}" data-ticket-discount="${event.groupBooking?.discount || 10}" min="0" max="${ticket.quantity - ticket.sold}" value="0" style="width: 80px; padding: 0.5rem; text-align: center;" onchange="updateBookingTotal()">
            </div>
          `).join("")}
        </div>
        <div class="form-row">
          <div class="form-group"><label>Full Name</label><input type="text" id="bookingName" value="${escapeHtml(user.name || '')}" required></div>
          <div class="form-group"><label>Email</label><input type="email" id="bookingEmail" value="${escapeHtml(user.email || '')}" required></div>
        </div>
        <div class="form-group"><label>Phone</label><input type="tel" id="bookingPhone" required></div>
        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--light); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><span>Subtotal:</span><strong id="bookingSubtotal">₹0.00</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; display:none;" id="discountRow"><span>Group Discount:</span><strong id="bookingDiscount">-₹0.00</strong></div>
          <div style="display: flex; justify-content: space-between; font-size: 1.2rem; border-top: 2px solid var(--accent); padding-top:0.5rem;"><span>Total:</span><strong id="bookingTotal">₹0.00</strong></div>
        </div>
        <button type="button" class="btn-submit" onclick="completeBooking()">Complete Booking</button>
      `;
      modal.classList.add("active");
      updateBookingTotal();
    } catch (error) {
      showNotification("error", error.message || "Failed to open booking");
    }
  }

  function updateBookingTotal() {
    const ticketInputs = Array.from(document.querySelectorAll("#bookingContent input[id^='ticket_']"));
    const subtotalEl = document.getElementById("bookingSubtotal");
    const totalEl = document.getElementById("bookingTotal");
    const discountRow = document.getElementById("discountRow");
    const discountEl = document.getElementById("bookingDiscount");
    if (!subtotalEl || !totalEl) return;

    let subtotal = 0;
    let count = 0;
    let discountPercent = 0;
    let minSize = 0;

    ticketInputs.forEach((input) => {
      const quantity = Number(input.value || 0);
      subtotal += quantity * Number(input.dataset.ticketPrice || 0);
      count += quantity;
      discountPercent = Number(input.dataset.ticketDiscount || 0);
      minSize = Number(input.dataset.ticketMinsize || 0);
    });

    let discount = 0;
    if (count >= minSize && discountPercent > 0) {
      discount = subtotal * (discountPercent / 100);
      if (discountRow) discountRow.style.display = "flex";
      if (discountEl) discountEl.textContent = `-₹${discount.toFixed(2)}`;
    } else if (discountRow) {
      discountRow.style.display = "none";
    }

    subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    totalEl.textContent = `₹${(subtotal - discount).toFixed(2)}`;
  }

  async function completeBooking() {
    if (!window.API.isAuthenticated()) {
      showNotification("error", "Please login to complete booking");
      window.location.href = "login.html";
      return;
    }

    const selectedTickets = Array.from(document.querySelectorAll("#bookingContent input[id^='ticket_']"))
      .map((input) => ({
        ticketType: input.dataset.ticketType,
        quantity: Number(input.value || 0)
      }))
      .filter((ticket) => ticket.quantity > 0);

    if (!selectedTickets.length) {
      showNotification("error", "Please select at least one ticket");
      return;
    }

    try {
      await window.API.bookings.create({
        eventId: valueOf("bookingEventId"),
        userName: valueOf("bookingName"),
        userEmail: valueOf("bookingEmail"),
        userPhone: valueOf("bookingPhone"),
        selectedTickets
      });

      closeModal("bookingModal");
      showNotification("success", "Booking confirmed");
      if (page === "dashboard") await loadDashboardData();
      if (page === "events") await loadEventsFromFilters();
    } catch (error) {
      showNotification("error", error.message || "Failed to create booking");
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm("Cancel booking?")) return;
    try {
      await window.API.bookings.cancel(bookingId);
      showNotification("success", "Booking cancelled");
      await loadDashboardData();
    } catch (error) {
      showNotification("error", error.message || "Failed to cancel booking");
    }
  }

  async function deleteEvent(eventId) {
    if (!confirm("Delete event?")) return;
    try {
      await window.API.events.delete(eventId);
      showNotification("success", "Event deleted");
      await loadDashboardData();
      if (page === "events") await loadEventsFromFilters();
    } catch (error) {
      showNotification("error", error.message || "Failed to delete event");
    }
  }

  async function deleteReminder(reminderId) {
    try {
      await window.API.reminders.delete(reminderId);
      showNotification("success", "Reminder deleted");
      const response = await window.API.reminders.getAll();
      state.reminders = response.data || [];
      renderReminders();
    } catch (error) {
      showNotification("error", error.message || "Failed to delete reminder");
    }
  }

  async function showAttendees(eventId) {
    state.attendeeEventId = eventId;
    switchTab("attendees");
    await loadAttendees(eventId);
  }

  function shareEvent(eventId) {
    const event = state.events.find((item) => String(item._id) === String(eventId));
    if (event) {
      navigator.clipboard.writeText(`${event.title} - ${window.location.origin}/events.html`);
      showNotification("success", "Link copied!");
    }
  }

  function showNotification(type, message) {
    const container = document.getElementById("notificationContainer");
    if (!container) return;

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-info-circle"}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
  }

  function toggleNotificationPanel() {
    const panel = document.getElementById("notificationPanel");
    if (panel) panel.classList.toggle("active");
  }

  function revealOnScroll() {
    document.querySelectorAll(".reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight - 120) {
        element.classList.add("active");
      }
    });
  }

  function getCategoryIcon(category) {
    const icons = {
      music: "fa-music",
      business: "fa-briefcase",
      tech: "fa-laptop-code",
      sports: "fa-basketball-ball",
      food: "fa-utensils",
      art: "fa-palette"
    };
    return icons[String(category || "").toLowerCase()] || "fa-calendar";
  }

  function formatCategory(category) {
    const value = String(category || "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString();
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateTime(value) {
    return `${formatDate(value)} at ${formatTime(value)}`;
  }

  function valueOf(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
  }

  function toIso(id) {
    const value = valueOf(id);
    return value ? new Date(value).toISOString() : "";
  }

  window.openEventDetail = openEventDetail;
  window.openBookingModal = openBookingModal;
  window.updateBookingTotal = updateBookingTotal;
  window.completeBooking = completeBooking;
  window.cancelBooking = cancelBooking;
  window.deleteEvent = deleteEvent;
  window.deleteReminder = deleteReminder;
  window.showAttendees = showAttendees;
  window.shareEvent = shareEvent;
})();
