// Global State Management
const state = {
    events: [],
    bookings: [],
    attendees: [],
    reminders: [],
    notifications: [],
    currentUser: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'organizer'
    },
    filters: {
        category: '',
        startDate: '',
        endDate: '',
        location: '',
        minPrice: '',
        maxPrice: ''
    }
};

// --- FAKE DATABASE LOGIC ---

function saveData() {
    localStorage.setItem('eventHubState', JSON.stringify(state));
}

function loadData() {
    const saved = localStorage.getItem('eventHubState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.events = parsed.events || [];
            state.bookings = parsed.bookings || [];
            state.reminders = parsed.reminders || [];
            state.notifications = parsed.notifications || [];
        } catch (e) {
            console.error("Error loading data", e);
            state.events = generateSampleEvents();
        }
    } else {
        console.log("No saved data found. Generating samples...");
        state.events = generateSampleEvents();
        generateNotifications();
        saveData();
    }
}

function generateSampleEvents() {
    const categories = ['music', 'business', 'tech', 'sports', 'food', 'art'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco'];
    const eventNames = {
        music: ['Summer Music Festival', 'Jazz Night', 'Rock Concert', 'Classical Evening'],
        business: ['Tech Summit', 'Business Networking', 'Leadership Conference', 'Startup Pitch'],
        tech: ['AI Conference', 'Web Development Workshop', 'Cybersecurity Summit', 'Cloud Computing Expo'],
        sports: ['Marathon Event', 'Yoga Retreat', 'Basketball Tournament', 'Fitness Bootcamp'],
        food: ['Wine Tasting', 'Food Festival', 'Cooking Workshop', 'Chef\'s Table'],
        art: ['Art Exhibition', 'Photography Workshop', 'Theater Performance', 'Dance Show']
    };

    const events = [];
    for (let i = 0; i < 12; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const names = eventNames[category];
        const name = names[Math.floor(Math.random() * names.length)];
        const price = Math.floor(Math.random() * 150) + 10;
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 60));
        
        events.push({
            id: i + 1,
            title: name,
            category: category,
            description: `Join us for an amazing ${category} event in ${city}. This will be an unforgettable experience!`,
            startDate: date.toISOString(),
            endDate: new Date(date.getTime() + 3600000 * 4).toISOString(),
            venue: {
                name: `${city} Convention Center`,
                address: `123 Main St, ${city}`,
                city: city,
                state: 'State'
            },
            price: price,
            tickets: [
                { type: 'General Admission', price: price, quantity: 100, sold: Math.floor(Math.random() * 50) },
                { type: 'VIP', price: price * 2, quantity: 50, sold: Math.floor(Math.random() * 25) }
            ],
            vendors: [
                { type: 'catering', name: 'Delicious Catering Co.', contact: '555-0101' },
                { type: 'photography', name: 'Snap Photos', contact: '555-0102' }
            ],
            groupBooking: {
                enabled: Math.random() > 0.5,
                minSize: 5,
                discount: 10
            },
            organizer: state.currentUser.id,
            attendees: Math.floor(Math.random() * 200) + 50
        });
    }
    return events;
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeApp();
});

function initializeApp() {
    setupEventListeners();

    // Page Specific Initialization
    const eventsGrid = document.getElementById('eventsGrid');
    if (eventsGrid) {
        displayEvents(state.events);
    }

    const dashboardEvents = document.getElementById('dashboardEvents');
    if (dashboardEvents) {
        displayDashboard();
        if(document.getElementById('bookingsList')) displayBookings();
        if(document.getElementById('attendeesList')) displayAttendees();
        if(document.getElementById('remindersList')) displayReminders();
    }

    if (state.notifications.length === 0) {
        generateNotifications();
    }
    displayNotifications();
    updateNotificationBadge();
    
    // Simulate real-time updates
    setInterval(() => {
        if (Math.random() > 0.7) {
            addNotification('info', 'New event added to your area!', 'Check out the latest events');
        }
    }, 30000);

    // Trigger Scroll Animation
    revealOnScroll();
    window.addEventListener('scroll', revealOnScroll);
}

// --- SAFE EVENT LISTENERS SETUP ---

function setupEventListeners() {
    const searchBtn = document.getElementById('heroSearchBtn');
    const searchInput = document.getElementById('heroSearch');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
        resetFiltersBtn.addEventListener('click', resetFilters);
    }

    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', handleCreateEvent);
        
        const addTicketBtn = document.getElementById('addTicketType');
        if (addTicketBtn) addTicketBtn.addEventListener('click', addTicketType);
        
        const addVendorBtn = document.getElementById('addVendor');
        if (addVendorBtn) addVendorBtn.addEventListener('click', addVendor);

        const groupBookingCheckbox = document.getElementById('enableGroupBooking');
        if (groupBookingCheckbox) groupBookingCheckbox.addEventListener('change', toggleGroupBooking);
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
        });
    }

    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal('eventModal'));

    const closeBookingBtn = document.getElementById('closeBookingModal');
    if (closeBookingBtn) closeBookingBtn.addEventListener('click', () => closeModal('bookingModal'));

    const closeReminderBtn = document.getElementById('closeReminderModal');
    if (closeReminderBtn) closeReminderBtn.addEventListener('click', () => closeModal('reminderModal'));

    const addReminderBtn = document.getElementById('addReminderBtn');
    if (addReminderBtn) addReminderBtn.addEventListener('click', openReminderModal);

    const reminderForm = document.getElementById('reminderForm');
    if (reminderForm) reminderForm.addEventListener('submit', handleAddReminder);

    const notifBtn = document.getElementById('notificationBtn');
    const closeNotifBtn = document.getElementById('closeNotificationPanel');
    if (notifBtn) notifBtn.addEventListener('click', toggleNotificationPanel);
    if (closeNotifBtn) closeNotifBtn.addEventListener('click', toggleNotificationPanel);

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showNotification('success', 'Logged in successfully!');
        });
    }
}

// --- LOGIC FUNCTIONS ---

function performSearch() {
    const searchInput = document.getElementById('heroSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const eventsGrid = document.getElementById('eventsGrid');
    
    if (eventsGrid) {
        const filtered = state.events.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.category.toLowerCase().includes(searchTerm) ||
            event.venue.city.toLowerCase().includes(searchTerm)
        );
        displayEvents(filtered);
    } else {
        window.location.href = 'events.html';
    }
}

function applyFilters() {
    state.filters = {
        category: document.getElementById('categoryFilter').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        location: document.getElementById('locationFilter').value.toLowerCase(),
        minPrice: parseFloat(document.getElementById('minPrice').value) || 0,
        maxPrice: parseFloat(document.getElementById('maxPrice').value) || Infinity
    };

    const filtered = state.events.filter(event => {
        const matchCategory = !state.filters.category || event.category === state.filters.category;
        const matchLocation = !state.filters.location || event.venue.city.toLowerCase().includes(state.filters.location);
        const matchPrice = event.price >= state.filters.minPrice && event.price <= state.filters.maxPrice;
        
        let matchDate = true;
        if (state.filters.startDate) {
            matchDate = matchDate && new Date(event.startDate) >= new Date(state.filters.startDate);
        }
        if (state.filters.endDate) {
            matchDate = matchDate && new Date(event.startDate) <= new Date(state.filters.endDate);
        }

        return matchCategory && matchLocation && matchPrice && matchDate;
    });

    displayEvents(filtered);
    showNotification('success', `Found ${filtered.length} events matching your criteria`);
}

function resetFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    state.filters = { category: '', startDate: '', endDate: '', location: '', minPrice: '', maxPrice: '' };
    displayEvents(state.events);
}

function displayEvents(events) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    if (events.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--dark-alt);">No events found matching your criteria.</div>';
        return;
    }

    grid.innerHTML = events.map(event => `
        <div class="event-card" onclick="openEventDetail(${event.id})">
            <div class="event-image"><i class="fas ${getCategoryIcon(event.category)}"></i></div>
            <div class="event-content">
                <span class="event-category">${formatCategory(event.category)}</span>
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <div class="event-meta-item"><i class="fas fa-calendar"></i><span>${formatDate(event.startDate)}</span></div>
                    <div class="event-meta-item"><i class="fas fa-clock"></i><span>${formatTime(event.startDate)}</span></div>
                    <div class="event-meta-item"><i class="fas fa-map-marker-alt"></i><span>${event.venue.city}</span></div>
                    <div class="event-meta-item"><i class="fas fa-users"></i><span>${event.attendees} attendees</span></div>
                </div>
                <div class="event-footer">
                    <span class="event-price">$${event.price}</span>
                    <button class="btn-book" onclick="event.stopPropagation(); openBookingModal(${event.id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openEventDetail(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventModal');
    const content = document.getElementById('eventDetailContent');
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="event-detail-header">
            <span class="event-category">${formatCategory(event.category)}</span>
            <h2 class="event-detail-title">${event.title}</h2>
            <p>${event.description}</p>
        </div>
        <div class="event-detail-section">
            <h3><i class="fas fa-calendar-alt"></i> Date & Time</h3>
            <p><strong>Start:</strong> ${formatDateTime(event.startDate)}</p>
            <p><strong>End:</strong> ${formatDateTime(event.endDate)}</p>
        </div>
        <div class="event-detail-section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <p><strong>${event.venue.name}</strong></p>
            <p>${event.venue.address}</p>
            <p>${event.venue.city}, ${event.venue.state}</p>
        </div>
        <div class="event-detail-section">
            <h3><i class="fas fa-ticket-alt"></i> Tickets Available</h3>
            <div class="ticket-options">
                ${event.tickets.map(ticket => `
                    <div class="ticket-option"><div><strong>${ticket.type}</strong><p>$${ticket.price} • ${ticket.quantity - ticket.sold} remaining</p></div></div>
                `).join('')}
            </div>
        </div>
        <div class="event-detail-section">
            <h3><i class="fas fa-handshake"></i> Vendors</h3>
            <div class="vendor-list">
                ${event.vendors.map(vendor => `
                    <div class="vendor-card"><div class="vendor-card-info"><div class="vendor-icon"><i class="fas ${getVendorIcon(vendor.type)}"></i></div><div><strong>${vendor.name}</strong><p>${formatVendorType(vendor.type)}</p></div></div></div>
                `).join('')}
            </div>
        </div>
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
            <button class="btn-submit" onclick="openBookingModal(${event.id})">Book Tickets</button>
            <button class="btn-action" onclick="shareEvent(${event.id})"><i class="fas fa-share-alt"></i> Share</button>
        </div>
    `;
    modal.classList.add('active');
}

function openBookingModal(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;
    closeModal('eventModal');
    
    const modal = document.getElementById('bookingModal');
    const content = document.getElementById('bookingContent');
    if (!modal || !content) return;

    content.innerHTML = `
        <h3>${event.title}</h3>
        <p style="color: var(--dark-alt); margin-bottom: 1.5rem;">${formatDateTime(event.startDate)}</p>
        <div class="form-group">
            <label>Select Tickets</label>
            ${event.tickets.map((ticket, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 0.5rem;">
                    <div><strong>${ticket.type}</strong><p>$${ticket.price}</p></div>
                    <input type="number" id="ticket_${index}" min="0" max="${ticket.quantity - ticket.sold}" value="0" style="width: 80px; padding: 0.5rem; text-align: center;" onchange="updateBookingTotal(${event.id})">
                </div>
            `).join('')}
        </div>
        <div class="form-row">
            <div class="form-group"><label>Full Name</label><input type="text" id="bookingName" value="${state.currentUser.name}" required></div>
            <div class="form-group"><label>Email</label><input type="email" id="bookingEmail" value="${state.currentUser.email}" required></div>
        </div>
        <div class="form-group"><label>Phone</label><input type="tel" id="bookingPhone" required></div>
        <div class="form-group"><label><input type="checkbox" id="enableReminder"> Send reminder</label></div>
        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--light); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><span>Subtotal:</span><strong id="bookingSubtotal">$0.00</strong></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; display:none;" id="discountRow"><span>Group Discount:</span><strong id="bookingDiscount">-$0.00</strong></div>
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem; border-top: 2px solid var(--accent); padding-top:0.5rem;"><span>Total:</span><strong id="bookingTotal">$0.00</strong></div>
        </div>
        <button type="button" class="btn-submit" onclick="completeBooking(${event.id})">Complete Booking</button>
    `;
    modal.classList.add('active');
}

function updateBookingTotal(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;
    let subtotal = 0, totalTickets = 0;
    event.tickets.forEach((ticket, index) => {
        const input = document.getElementById(`ticket_${index}`);
        const quantity = parseInt(input ? input.value : 0) || 0;
        subtotal += ticket.price * quantity;
        totalTickets += quantity;
    });
    let discount = 0;
    const discountRow = document.getElementById('discountRow');
    if (event.groupBooking.enabled && totalTickets >= event.groupBooking.minSize) {
        discount = subtotal * (event.groupBooking.discount / 100);
        if(discountRow) { discountRow.style.display = 'flex'; document.getElementById('bookingDiscount').textContent = `-$${discount.toFixed(2)}`; }
    } else {
        if(discountRow) discountRow.style.display = 'none';
    }
    document.getElementById('bookingSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('bookingTotal').textContent = `$${(subtotal - discount).toFixed(2)}`;
}

function completeBooking(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;
    const totalElem = document.getElementById('bookingTotal');
    if (!totalElem) return;

    const booking = {
        id: state.bookings.length + 1, eventId: eventId, eventTitle: event.title,
        userName: document.getElementById('bookingName').value, userEmail: document.getElementById('bookingEmail').value,
        userPhone: document.getElementById('bookingPhone').value, tickets: [],
        total: parseFloat(totalElem.textContent.replace('$', '')), bookingDate: new Date().toISOString(), status: 'confirmed'
    };
    event.tickets.forEach((ticket, index) => {
        const input = document.getElementById(`ticket_${index}`);
        const quantity = parseInt(input ? input.value : 0) || 0;
        if (quantity > 0) { booking.tickets.push({ type: ticket.type, quantity: quantity, price: ticket.price }); ticket.sold += quantity; }
    });
    if (booking.tickets.length === 0) { showNotification('error', 'Please select at least one ticket'); return; }
    state.bookings.push(booking);
    
    const reminderCheck = document.getElementById('enableReminder');
    if (reminderCheck && reminderCheck.checked) {
        const reminderDate = new Date(event.startDate);
        reminderDate.setHours(reminderDate.getHours() - 24);
        state.reminders.push({ id: state.reminders.length + 1, eventId: eventId, eventTitle: event.title, dateTime: reminderDate.toISOString(), message: `Don't forget! Your event "${event.title}" starts tomorrow.` });
    }
    saveData(); closeModal('bookingModal'); showNotification('success', 'Booking confirmed!'); addNotification('success', 'Booking Confirmed', `Your tickets for ${event.title} have been booked!`);
    const dashboardEvents = document.getElementById('dashboardEvents');
    if (dashboardEvents) displayDashboard();
}

function handleCreateEvent(e) {
    e.preventDefault();
    const ticketTypes = [], vendors = [];
    document.querySelectorAll('.ticket-type').forEach(ticket => {
        ticketTypes.push({ type: ticket.querySelector('.ticketName').value, price: parseFloat(ticket.querySelector('.ticketPrice').value), quantity: parseInt(ticket.querySelector('.ticketQuantity').value), sold: 0 });
    });
    document.querySelectorAll('.vendor-item').forEach(vendor => {
        vendors.push({ type: vendor.querySelector('.vendorType').value, name: vendor.querySelector('.vendorName').value, contact: vendor.querySelector('.vendorContact').value });
    });
    const newEvent = {
        id: state.events.length + 1, title: document.getElementById('eventTitle').value, category: document.getElementById('eventCategory').value, description: document.getElementById('eventDescription').value,
        startDate: document.getElementById('eventStartDate').value, endDate: document.getElementById('eventEndDate').value,
        venue: { name: document.getElementById('venueName').value, address: document.getElementById('venueAddress').value, city: document.getElementById('venueCity').value, state: document.getElementById('venueState').value },
        price: ticketTypes[0]?.price || 0, tickets: ticketTypes, vendors: vendors,
        groupBooking: { enabled: document.getElementById('enableGroupBooking').checked, minSize: parseInt(document.getElementById('groupMinSize').value) || 5, discount: parseInt(document.getElementById('groupDiscount').value) || 10 },
        organizer: state.currentUser.id, attendees: 0
    };
    state.events.unshift(newEvent); saveData(); document.getElementById('createEventForm').reset(); showNotification('success', 'Event created successfully!');
    setTimeout(() => { window.location.href = 'events.html'; }, 1500);
}

function addTicketType() {
    const container = document.getElementById('ticketTypes'); if(!container) return;
    const ticketType = document.createElement('div'); ticketType.className = 'ticket-type';
    ticketType.innerHTML = `<div class="form-row"><div class="form-group"><label>Type</label><input type="text" class="ticketName" placeholder="e.g. GA" required></div><div class="form-group"><label>Price</label><input type="number" class="ticketPrice" required></div><div class="form-group"><label>Qty</label><input type="number" class="ticketQuantity" required></div><button type="button" class="btn-remove-ticket" onclick="this.closest('.ticket-type').remove()"><i class="fas fa-trash"></i></button></div>`;
    container.appendChild(ticketType);
}
function addVendor() {
    const container = document.getElementById('vendorList'); if(!container) return;
    const vendorItem = document.createElement('div'); vendorItem.className = 'vendor-item';
    vendorItem.innerHTML = `<div class="form-row"><div class="form-group"><label>Type</label><select class="vendorType" required><option value="catering">Catering</option><option value="photography">Photography</option><option value="audio">Audio</option><option value="security">Security</option></select></div><div class="form-group"><label>Name</label><input type="text" class="vendorName" required></div><div class="form-group"><label>Contact</label><input type="text" class="vendorContact" required></div><button type="button" class="btn-remove-vendor" onclick="this.closest('.vendor-item').remove()"><i class="fas fa-trash"></i></button></div>`;
    container.appendChild(vendorItem);
}
function toggleGroupBooking(e) { const options = document.getElementById('groupBookingOptions'); if(options) options.style.display = e.target.checked ? 'block' : 'none'; }
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`); if(activeBtn) activeBtn.classList.add('active');
    const activeContent = document.getElementById(tabName); if(activeContent) activeContent.classList.add('active');
    if (tabName === 'myEvents') displayDashboard(); if (tabName === 'bookings') displayBookings(); if (tabName === 'attendees') displayAttendees(); if (tabName === 'reminders') displayReminders();
}
function displayDashboard() {
    const container = document.getElementById('dashboardEvents'); if (!container) return;
    const userEvents = state.events.filter(e => e.organizer === state.currentUser.id);
    if (userEvents.length === 0) { container.innerHTML = '<p style="text-align: center; padding: 2rem;">You haven\'t created any events yet.</p>'; return; }
    container.innerHTML = userEvents.map(event => `<div class="dashboard-event-card"><div class="dashboard-event-info"><h3>${event.title}</h3><p>${formatDateTime(event.startDate)}</p><div class="dashboard-event-stats"><span><i class="fas fa-users"></i> ${event.attendees}</span><span><i class="fas fa-dollar-sign"></i> ${calculateRevenue(event)}</span></div></div><div class="dashboard-event-actions"><button class="btn-action" onclick="openEventDetail(${event.id})">View</button><button class="btn-action btn-danger" onclick="deleteEvent(${event.id})">Delete</button></div></div>`).join('');
}
function displayBookings() {
    const container = document.getElementById('bookingsList'); if (!container) return;
    if (state.bookings.length === 0) { container.innerHTML = '<p style="text-align: center; padding: 2rem;">No bookings yet.</p>'; return; }
    container.innerHTML = state.bookings.map(booking => `<div class="booking-card"><div class="booking-card-header"><h3>${booking.eventTitle}</h3><span class="booking-status confirmed">Confirmed</span></div><div class="booking-details"><p>Booked on: ${formatDate(booking.bookingDate)}</p><p>Total: $${booking.total.toFixed(2)}</p></div><button class="btn-action btn-danger" onclick="cancelBooking(${booking.id})">Cancel</button></div>`).join('');
}
function displayAttendees() { const container = document.getElementById('attendeesList'); if (container) { const total = document.getElementById('totalAttendees'); if(total) total.textContent = "5"; container.innerHTML = `<p style="padding:1rem;">Attendee list requires backend integration.</p>`; } }
function displayReminders() {
    const container = document.getElementById('remindersList'); if (!container) return;
    if (state.reminders.length === 0) { container.innerHTML = '<p style="text-align: center;">No reminders set.</p>'; return; }
    container.innerHTML = state.reminders.map(reminder => `<div class="reminder-item"><div class="reminder-header"><div class="reminder-title">${reminder.eventTitle}</div><button class="btn-delete-reminder" onclick="deleteReminder(${reminder.id})"><i class="fas fa-trash"></i></button></div><div class="reminder-message">${reminder.message}</div></div>`).join('');
}
function openReminderModal() {
    const modal = document.getElementById('reminderModal'); const select = document.getElementById('reminderEvent'); if(!modal || !select) return;
    select.innerHTML = '<option value="">Select Event</option>' + state.events.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
    modal.classList.add('active');
}
function handleAddReminder(e) {
    e.preventDefault(); const eventId = parseInt(document.getElementById('reminderEvent').value); const event = state.events.find(e => e.id === eventId); if (!event) return;
    state.reminders.push({ id: state.reminders.length + 1, eventId: eventId, eventTitle: event.title, dateTime: document.getElementById('reminderDateTime').value, message: document.getElementById('reminderMessage').value });
    saveData(); closeModal('reminderModal'); showNotification('success', 'Reminder set!'); displayReminders(); document.getElementById('reminderForm').reset();
}
function deleteReminder(id) { state.reminders = state.reminders.filter(r => r.id !== id); saveData(); displayReminders(); showNotification('success', 'Reminder deleted'); }
function generateNotifications() { state.notifications = [{ id: 1, type: 'info', title: 'New Event', message: 'New tech conference nearby!', time: new Date().toISOString() }]; }
function displayNotifications() {
    const container = document.getElementById('notificationsList'); if (!container) return;
    if (state.notifications.length === 0) { container.innerHTML = '<p style="padding: 1rem; text-align: center;">No notifications</p>'; return; }
    container.innerHTML = state.notifications.map(notif => `<div class="notification-item"><div class="notification-item-title">${notif.title}</div><div class="notification-item-message">${notif.message}</div></div>`).join('');
}
function addNotification(type, title, message) { state.notifications.unshift({ id: state.notifications.length + 1, type, title, message, time: new Date().toISOString() }); saveData(); displayNotifications(); updateNotificationBadge(); }
function updateNotificationBadge() { const badge = document.getElementById('notificationBadge'); if(badge) badge.textContent = state.notifications.length; }
function toggleNotificationPanel() { const panel = document.getElementById('notificationPanel'); if(panel) panel.classList.toggle('active'); }
function showNotification(type, message) {
    const container = document.getElementById('notificationContainer'); if (!container) return;
    const notification = document.createElement('div'); notification.className = `notification ${type}`; const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`; container.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideIn 0.3s reverse'; setTimeout(() => notification.remove(), 300); }, 3000);
}
function closeModal(modalId) { const modal = document.getElementById(modalId); if(modal) modal.classList.remove('active'); }
function formatCategory(c) { return c.charAt(0).toUpperCase() + c.slice(1); }
function getCategoryIcon(c) { const icons = { music: 'fa-music', business: 'fa-briefcase', tech: 'fa-laptop-code', sports: 'fa-basketball-ball' }; return icons[c] || 'fa-calendar'; }
function getVendorIcon(t) { return 'fa-handshake'; }
function formatVendorType(t) { return t; }
function formatDate(d) { return new Date(d).toLocaleDateString(); }
function formatTime(d) { return new Date(d).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); }
function formatDateTime(d) { return `${formatDate(d)} at ${formatTime(d)}`; }
function formatTimeAgo(d) { return 'Just now'; }
function calculateRevenue(e) { return e.tickets.reduce((sum, t) => sum + (t.price * t.sold), 0).toFixed(2); }
function shareEvent(id) { const event = state.events.find(e => e.id === id); if (event) { navigator.clipboard.writeText(`${event.title} - Check it out!`); showNotification('success', 'Link copied!'); } }
function cancelBooking(id) { if (confirm('Cancel booking?')) { state.bookings = state.bookings.filter(b => b.id !== id); saveData(); displayBookings(); showNotification('success', 'Booking cancelled'); } }
function deleteEvent(id) { if (confirm('Delete event?')) { state.events = state.events.filter(e => e.id !== id); saveData(); displayDashboard(); showNotification('success', 'Event deleted'); } }
function revealOnScroll() { var reveals = document.querySelectorAll('.reveal'); for (var i = 0; i < reveals.length; i++) { var windowHeight = window.innerHeight; var elementTop = reveals[i].getBoundingClientRect().top; var elementVisible = 150; if (elementTop < windowHeight - elementVisible) { reveals[i].classList.add('active'); } } }