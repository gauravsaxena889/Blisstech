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
let reconnectCooldown = false;

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
    connectedToMobile = true;
    updateStatusUI();
  });

  socket.on("mobile-disconnected", () => {
    connectedToMobile = false;
    updateStatusUI();
  });

  socket.on("web-joined", () => {
    connectedToWeb = true;
    updateStatusUI();
  });

  socket.on("web-disconnected", () => {
    connectedToWeb = false;
    updateStatusUI();
  });

  socket.on("presence-update", ({ users }) => {
    const webPresent = users.some(u => u.role === "web");
    const mobilePresent = users.some(u => u.role === "mobile");

    connectedToWeb = webPresent;
    connectedToMobile = mobilePresent;

    console.log("📡 presence-update →", {
      connectedToWeb,
      connectedToMobile,
      from: users
    });

    updateStatusUI();
  });

  updateStatusUI();
}

window.FallbackUI = {
  init(socket, role) {
    simulateFallback(socket, role);

    socket.off("disconnect").on("disconnect", () => {
      console.warn("⚠️ Socket disconnected");
      if (role === "web") connectedToWeb = false;
      if (role === "mobile") connectedToMobile = false;
      updateStatusUI();
    });

    socket.off("connect").on("connect", () => {
      console.log("✅ Socket reconnected");

      const spaceId = window.joinedSpace || localStorage.getItem("lastSpace");
      const userId = localStorage.getItem("userId");
      const currentRole = window.role || "web";

      connectedToWeb = false;
      connectedToMobile = false;

      if (spaceId && userId && socket.connected) {
        console.log("🧠 Waiting for presence-update to restore state...");
        console.log("⏳ Waiting 2s before rejoining space...");

        setTimeout(() => {
          if (socket.connected) {
            console.log("🔁 Rejoining space:", spaceId);
            socket.emit("join-space", { spaceId, userId, role: currentRole });

            // Just in case presence-update is missed
            setTimeout(() => {
              console.log("🔍 Final UI fallback after rejoin");
              updateStatusUI();
            }, 2000);
          }
        }, 2000);
      } else {
        console.warn("⚠️ Missing spaceId or userId on reconnect");
      }
    });

    socket.on("connect_error", () => {
      console.warn("❌ Socket connect error");
      statusEl.innerText = navigator.onLine
        ? "⚠️ Server unreachable — retrying..."
        : "🚫 No internet — retrying...";
      statusEl.style.backgroundColor = navigator.onLine ? "#e17055" : "#d63031";
    });

    window.addEventListener("online", () => {
      console.log("🌐 Internet back online");
      statusEl.innerText = "🌐 Reconnecting...";
      statusEl.style.backgroundColor = "#3498db";
      if (!socket.connected && !reconnectCooldown) {
        reconnectCooldown = true;
        socket.connect();
        setTimeout(() => (reconnectCooldown = false), 10000);
      }
    });

    window.addEventListener("offline", () => {
      statusEl.innerText = "🚫 Internet disconnected";
      statusEl.style.backgroundColor = "#d63031";
    });
  }
};
