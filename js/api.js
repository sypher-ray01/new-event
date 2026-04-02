(function attachEventHubApi(window) {
  const API_BASE_URL = "http://localhost:5000/api";

  function getStoredValue(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }

  function getToken() {
    return getStoredValue("token");
  }

  function getCurrentUser() {
    const raw = getStoredValue("user");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function storeAuthData(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    otherStorage.removeItem("token");
    otherStorage.removeItem("user");
    storage.setItem("token", token);
    storage.setItem("user", JSON.stringify(user));
  }

  function clearAuthData() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  }

  async function request(path, options) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { success: response.ok, message: await response.text() };

    if (!response.ok) {
      throw new Error(payload.message || "Request failed");
    }

    return payload;
  }

  function normalizeEventPayload(eventData) {
    const addressParts = (eventData.address || "")
      .split(",")
      .map((part) => part.trim());

    return {
      title: eventData.title,
      description: eventData.description,
      category: String(eventData.category || "").toLowerCase(),
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      price: Number(eventData.price || 0),
      status: eventData.status || "published",
      tickets: (eventData.tickets || []).map((ticket) => ({
        type: ticket.type || ticket.name,
        price: Number(ticket.price || 0),
        quantity: Number(ticket.quantity || 0),
        sold: Number(ticket.sold || 0)
      })),
      vendors: (eventData.vendors || []).map((vendor) => ({
        type: vendor.type || vendor.description || "vendor",
        name: vendor.name,
        contact: vendor.contact
      })),
      groupBooking: eventData.groupBooking || {
        enabled: false,
        minSize: 5,
        discount: 10
      },
      venue: {
        name: eventData.venue?.name || eventData.location || "",
        address: eventData.venue?.address || addressParts[0] || "",
        city: eventData.venue?.city || addressParts[1] || "",
        state: eventData.venue?.state || addressParts[2] || ""
      }
    };
  }

  window.API = {
    baseUrl: API_BASE_URL,
    getToken,
    getCurrentUser,
    isAuthenticated() {
      return Boolean(getToken());
    },
    clearAuthData,
    auth: {
      register(payload) {
        return request("/auth/register", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      login(payload) {
        return request("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      me() {
        return request("/auth/me");
      },
      storeAuthData
    },
    events: {
      getAll(params) {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query.append(key, value);
          }
        });
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return request(`/events${suffix}`);
      },
      getById(id) {
        return request(`/events/${id}`);
      },
      create(payload) {
        return request("/events", {
          method: "POST",
          body: JSON.stringify(normalizeEventPayload(payload))
        });
      },
      update(id, payload) {
        return request(`/events/${id}`, {
          method: "PUT",
          body: JSON.stringify(normalizeEventPayload(payload))
        });
      },
      delete(id) {
        return request(`/events/${id}`, {
          method: "DELETE"
        });
      },
      async register(eventId, payload) {
        const user = getCurrentUser() || {};
        let selectedTickets = payload?.selectedTickets;

        if (!selectedTickets || !selectedTickets.length) {
          const eventResponse = await request(`/events/${eventId}`);
          const firstTicket = eventResponse.data?.tickets?.[0];
          selectedTickets = firstTicket
            ? [{ ticketType: firstTicket.type, quantity: 1 }]
            : [{ ticketType: "General Admission", quantity: 1 }];
        }

        return request(`/events/${eventId}/register`, {
          method: "POST",
          body: JSON.stringify({
            userName: payload?.userName || user.name || "Guest User",
            userEmail: payload?.userEmail || user.email || "guest@example.com",
            userPhone: payload?.userPhone || "0000000000",
            selectedTickets
          })
        });
      },
      getMyEvents() {
        return request("/events/my/events");
      },
      getMyRegistrations() {
        return request("/bookings/my");
      },
      getAttendees(eventId) {
        return request(`/events/${eventId}/attendees`);
      }
    },
    bookings: {
      create(payload) {
        return request("/bookings", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      getMy() {
        return request("/bookings/my");
      },
      cancel(id) {
        return request(`/bookings/${id}`, {
          method: "DELETE"
        });
      }
    },
    reminders: {
      getAll() {
        return request("/reminders");
      },
      create(payload) {
        return request("/reminders", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      delete(id) {
        return request(`/reminders/${id}`, {
          method: "DELETE"
        });
      }
    },
    dashboard: {
      getSummary() {
        return request("/dashboard/summary");
      }
    }
  };
})(window);
