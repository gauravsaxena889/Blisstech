// ✅ Final Fallback Logic for Manvas UI (Corrected Base Logic + Hybrid)
// Handles 16 scenarios + navigator.onLine + server ping with precise peer visibility logic

let statusEl = document.getElementById("fallbackStatus");
if (!statusEl) {
  statusEl = document.createElement("div");
  statusEl.id = "fallbackStatus";
  Object.assign(statusEl.style, {
    position: "fixed",
    top: "10px",
    right: "10px",
    padding: "10px 16px",
    borderRadius: "8px",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#6c5ce7",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 9999,
    transition: "all 0.3s ease-in-out"
  });
  statusEl.innerText = "🔄 Initializing...";
  document.body.appendChild(statusEl);
}

let connectedToWeb = false;
let connectedToMobile = false;
let lastPresence = [];

function updateStatusUI(socket, role) {
  const socketConnected = socket.connected;
  const browserOnline = navigator.onLine;

  console.log("🔁 UI State:", {
    role,
    socketConnected,
    browserOnline,
    connectedToWeb,
    connectedToMobile
  });

  if (!browserOnline) {
    statusEl.innerText = "📡 No internet connection";
    statusEl.style.backgroundColor = "#c0392b";
    return;
  }

  if (!socketConnected) {
    statusEl.innerText = role === "web" ? "🖥️ Reconnecting..." : "📱 Reconnecting...";
    statusEl.style.backgroundColor = "#6c5ce7";
    return;
  }

  if (connectedToWeb && connectedToMobile) {
    statusEl.innerText = "✅ Connected on both devices";
    statusEl.style.backgroundColor = "#27ae60";
  } else if (role === "web" && connectedToWeb) {
    statusEl.innerText = "🖥️ Connected on Web";
    statusEl.style.backgroundColor = "#2980b9";
  } else if (role === "mobile" && connectedToMobile) {
    statusEl.innerText = "📱 Connected on Mobile";
    statusEl.style.backgroundColor = "#f39c12";
  } else {
    statusEl.innerText = "🔄 Verifying peer connection...";
    statusEl.style.backgroundColor = "#6c5ce7";
  }
}

function handlePresence(users, socket, role) {
  lastPresence = users;
  connectedToWeb = users.some(u => u.role === "web");
  connectedToMobile = users.some(u => u.role === "mobile");
  updateStatusUI(socket, role);
}

function setupFallbackListeners(socket, role) {
  [
    "web-joined", "web-disconnected",
    "mobile-joined", "mobile-disconnected",
    "presence-update", "verified-presence"
  ].forEach(e => socket.off(e));

  socket.on("presence-update", ({ users }) => handlePresence(users, socket, role));
  socket.on("verified-presence", ({ users }) => handlePresence(users, socket, role));

  socket.on("disconnect", () => {
    console.warn("⚠️ Socket disconnected");
    if (role === "web") connectedToWeb = false;
    if (role === "mobile") connectedToMobile = false;
    // Do not clear peer state — let presence-update decide
    updateStatusUI(socket, role);
  });

  socket.on("connect", () => {
    console.log("✅ Socket reconnected");
    updateStatusUI(socket, role);

    const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
    const userId = localStorage.getItem("userId");
    if (spaceId && userId) {
      socket.emit("join-space", { spaceId, userId, role });
      setTimeout(() => socket.emit("manual-ping", { spaceId }), 1000);
    }
  });

  window.addEventListener("online", () => updateStatusUI(socket, role));
  window.addEventListener("offline", () => updateStatusUI(socket, role));
}

window.FallbackUI = {
  init(socket, role) {
    setupFallbackListeners(socket, role);
    updateStatusUI(socket, role);

    const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
    if (spaceId) socket.emit("manual-ping", { spaceId });
  }
};
