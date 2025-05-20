// fallback-ui-final.js — robust fallback with smart reconnect + internet check

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

        console.log("⏳ Waiting 2s before rejoining space...");
        setTimeout(() => {
          if (socket.connected) {
            console.log("🔁 Rejoining space:", spaceId);
            socket.emit("join-space", { spaceId, userId, role: currentRole });
          }
        }, 2000);
      } else {
        console.warn("⚠️ Missing spaceId or userId on reconnect");
      }
    });

    socket.on("connect_error", () => {
      console.warn("❌ Socket connect error");
      if (!navigator.onLine) {
        statusEl.innerText = "🚫 No internet — retrying when back";
        statusEl.style.backgroundColor = "#d63031";
      } else {
        statusEl.innerText = "⚠️ Server unreachable — retrying...";
        statusEl.style.backgroundColor = "#e17055";
      }
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔁 Reconnect attempt #${attempt}`);
      statusEl.innerText = `🔄 Trying to reconnect... (attempt ${attempt})`;
      statusEl.style.backgroundColor = "#a29bfe";
    });

    // Smart manual reconnect trigger on network recovery
    function attemptSmartReconnect() {
      if (navigator.onLine && !socket.connected && !reconnectCooldown) {
        reconnectCooldown = true;
        console.log("🌐 Triggering smart reconnect...");
        socket.connect();
        setTimeout(() => reconnectCooldown = false, 10000); // 10s cooldown
      }
    }

    window.addEventListener("online", () => {
      console.log("🌐 Internet back online");
      statusEl.innerText = "🌐 Internet restored";
      statusEl.style.backgroundColor = "#27ae60";
      setTimeout(attemptSmartReconnect, 1500);
    });

    window.addEventListener("offline", () => {
      console.warn("🚫 Internet connection lost");
      statusEl.innerText = "🚫 Internet disconnected";
      statusEl.style.backgroundColor = "#d63031";
    });
  }
};
