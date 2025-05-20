// fallback-ui-final.js — robust fallback status sync and reconnect support

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
    connectedToWeb = users.some(u => u.role === "web");
    connectedToMobile = users.some(u => u.role === "mobile");
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
  const currentRole = window.role || "web";

  console.log("🧠 Waiting for presence-update to restore state...");

  if (spaceId && userId && socket.connected) {
    if (socket.data?.spaceId === spaceId && socket.data?.userId === userId) {
      console.log("🟡 Already joined, skipping rejoin.");
      return;
    }

    console.log("🔁 Rejoining space:", spaceId);
    socket.emit("join-space", { spaceId, userId, role: currentRole });
  } else {
    console.warn("⚠️ Missing spaceId or userId on reconnect");
  }
});

      // simulateFallback is NOT called here again
    });
  }
};
