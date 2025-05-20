// fallback-ui.js — Final Fix with accurate role detection

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

function simulateFallback(socket, currentRole) {
  [
    "mobile-joined",
    "mobile-disconnected",
    "web-joined",
    "web-disconnected",
    "presence-update"
  ].forEach(event => socket.off(event));

  socket.on("mobile-joined", () => {
    console.log("📲 Mobile joined");
    connectedToMobile = true;
    updateStatusUI();
  });

  socket.on("mobile-disconnected", () => {
    console.log("📴 Mobile disconnected");
    connectedToMobile = false;
    updateStatusUI();
  });

  socket.on("web-joined", () => {
    console.log("🖥️ Web joined");
    connectedToWeb = true;
    updateStatusUI();
  });

  socket.on("web-disconnected", () => {
    console.log("🛑 Web disconnected");
    connectedToWeb = false;
    updateStatusUI();
  });

  socket.on("presence-update", ({ users }) => {
    console.log("📡 presence-update →", users);
    connectedToWeb = users.some(u => u.role === "web");
    connectedToMobile = users.some(u => u.role === "mobile");
    updateStatusUI();
  });

  updateStatusUI();
}

window.FallbackUI = {
  init(socket, role) {
    connectedToWeb = false;
    connectedToMobile = false;

    simulateFallback(socket, role);

    socket.off("disconnect").on("disconnect", () => {
      console.warn("⚠️ Socket disconnected");
      connectedToWeb = false;
      connectedToMobile = false;
      updateStatusUI();
    });

    socket.off("connect").on("connect", () => {
      console.log("✅ Socket reconnected");

      const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
      const userId = localStorage.getItem("userId");
      const currentRole = window.role || role;

      if (spaceId && userId && socket.connected) {
        console.log("🧠 Waiting for presence-update to restore state...");
        setTimeout(() => {
          console.log("⏳ Waiting 2s before rejoining space...");
          socket.emit("join-space", { spaceId, userId, role: currentRole });
          simulateFallback(socket, currentRole);
          console.log("🔁 Rejoining space:", spaceId);

          setTimeout(() => {
            console.log("🔍 Final UI fallback after rejoin");
            socket.emit("manual-ping", { spaceId });
          }, 3000);
        }, 2000);
      }

      updateStatusUI();
    });
  }
};
