let statusEl = document.getElementById("fallbackStatus");
if (!statusEl) {
  statusEl = document.createElement("div");
  statusEl.id = "fallbackStatus";
  Object.assign(statusEl.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    color: "#fff",
    backgroundColor: "#6c5ce7",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 9999
  });
  statusEl.innerText = "🔄 Connecting...";
  document.body.appendChild(statusEl);
}

let connectedToWeb = false;
let connectedToMobile = false;

function updateStatusUI() {
  console.log("🧾 UI Update →", {
    connectedToWeb,
    connectedToMobile
  });

  if (connectedToWeb && connectedToMobile) {
    statusEl.innerText = "✅ Connected on both devices";
    statusEl.style.backgroundColor = "#27ae60";
  } else if (connectedToWeb) {
    statusEl.innerText = "🖥️ Connected on Web";
    statusEl.style.backgroundColor = "#2980b9";
  } else if (connectedToMobile) {
    statusEl.innerText = "📱 Connected on Mobile";
    statusEl.style.backgroundColor = "#f39c12";
  } else {
    statusEl.innerText = "🔄 Waiting for connection...";
    statusEl.style.backgroundColor = "#6c5ce7";
  }
}

function simulateFallback(socket, role) {
  [
    "mobile-joined",
    "mobile-disconnected",
    "web-joined",
    "web-disconnected",
    "presence-update",
    "verified-presence"
  ].forEach(event => socket.off(event));

  socket.on("verified-presence", ({ users }) => {
    const isWeb = users.some(u => u.role === "web");
    const isMobile = users.some(u => u.role === "mobile");

    if (role === "web") {
      connectedToWeb = true;
      connectedToMobile = isMobile;
    } else if (role === "mobile") {
      connectedToMobile = true;
      connectedToWeb = isWeb;
    }

    console.log("✅ Verified Presence:", users);
    updateStatusUI();
  });

  socket.on("presence-update", ({ users }) => {
    console.log("📡 presence-update →", users);

    const isWeb = users.some(u => u.role === "web");
    const isMobile = users.some(u => u.role === "mobile");

    if (window.role === "web") {
      connectedToWeb = true;
      connectedToMobile = isMobile;
    } else if (window.role === "mobile") {
      connectedToMobile = true;
      connectedToWeb = isWeb;
    }

    updateStatusUI();
  });

  socket.on("mobile-joined", () => {
    console.log("📲 Mobile joined");
    connectedToMobile = true;
    updateStatusUI();
  });

  socket.on("mobile-disconnected", () => {
    console.log("📴 Mobile disconnected (event)");
    if (window.role === "web") {
      connectedToMobile = false;
      updateStatusUI();
    }
  });

  socket.on("web-joined", () => {
    console.log("🖥️ Web joined");
    connectedToWeb = true;
    updateStatusUI();
  });

  socket.on("web-disconnected", () => {
    console.log("🛑 Web disconnected (event)");
    if (window.role === "mobile") {
      connectedToWeb = false;
      updateStatusUI();
    }
  });

  updateStatusUI();
}

window.FallbackUI = {
  init(socket, role) {
    // 🌐 1. Instant local guess
    if (role === "web") {
      connectedToWeb = socket.connected;
    } else {
      connectedToMobile = socket.connected;
    }

    updateStatusUI();
    simulateFallback(socket, role);

    socket.off("disconnect").on("disconnect", () => {
      console.warn("⚠️ Socket disconnected");

      // Always reset own state
      if (role === "web") connectedToWeb = false;
      else connectedToMobile = false;

      // 🚨 Force-clear peer state (in case event doesn't arrive)
      if (role === "mobile") connectedToWeb = false;
      if (role === "web") connectedToMobile = false;

      updateStatusUI();

      // Only emit ping if socket is still alive
      const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
      if (spaceId && socket.connected) {
        setTimeout(() => {
          console.log("📡 Post-disconnect manual ping");
          socket.emit("manual-ping", { spaceId });
        }, 1000);
      }
    });

    socket.off("connect").on("connect", () => {
      console.log("✅ Socket reconnected");

      const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
      const userId = localStorage.getItem("userId");
      const currentRole = window.role || role;

      if (spaceId && userId && socket.connected) {
        console.log("🧠 Rejoining space...");
        setTimeout(() => {
          socket.emit("join-space", { spaceId, userId, role: currentRole });
          setTimeout(() => {
            console.log("📡 Sending manual-ping after reconnect");
            socket.emit("manual-ping", { spaceId });
          }, 1000);
        }, 1000);
      }

      updateStatusUI();
    });

    // ✅ Initial verification on first join
    const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
    if (spaceId) {
      console.log("📡 Sending initial manual-ping for verified status");
      socket.emit("manual-ping", { spaceId });
    }
  }
};
