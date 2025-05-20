// fallback-ui-final.js — with full listener sync, reconnect rejoin, and debug logs

let statusEl = document.getElementById("fallbackStatus");
if (!statusEl) {
  statusEl = document.createElement("div");
  statusEl.id = "fallbackStatus";
  statusEl.style.position = "fixed";
  statusEl.style.bottom = "20px";
  statusEl.style.right = "20px";
  statusEl.style.padding = "12px 20px";
  statusEl.style.borderRadius = "8px";
  statusEl.style.fontFamily = "Inter, sans-serif";
  statusEl.style.fontSize = "14px";
  statusEl.style.color = "#fff";
  statusEl.style.backgroundColor = "#6c5ce7";
  statusEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  statusEl.style.zIndex = 9999;
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
  if (currentRole === "web") connectedToWeb = true;
  if (currentRole === "mobile") connectedToMobile = true;

  socket.off("mobile-joined").on("mobile-joined", () => {
    console.log("📲 Mobile joined event received");
    connectedToMobile = true;
    updateStatusUI();
  });

  socket.off("mobile-disconnected").on("mobile-disconnected", () => {
    console.log("📴 Mobile disconnected event received");
    connectedToMobile = false;
    updateStatusUI();
  });

  socket.off("web-joined").on("web-joined", () => {
    console.log("🖥️ Web joined event received");
    connectedToWeb = true;
    updateStatusUI();
  });

  socket.off("web-disconnected").on("web-disconnected", () => {
    console.log("🛑 Web disconnected event received");
    connectedToWeb = false;
    updateStatusUI();
  });

  updateStatusUI();
}

window.FallbackUI = {
  init(socket, role) {
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
      const role = window.role || "web";

      if (spaceId && userId && socket.connected) {
        console.log("🔁 Rejoining space:", spaceId);
        socket.emit("join-space", { spaceId, userId, role });
        simulateFallback(socket, role);
      } else {
        console.warn("⚠️ Missing spaceId or userId on reconnect");
      }

      updateStatusUI();
    });
  }
};
