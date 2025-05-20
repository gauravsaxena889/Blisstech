// fallback-ui.js
const statusEl = document.createElement("div");
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

// simulate socket fallback triggers
function simulateFallback(socket, currentRole) {
  if (currentRole === "web") {
    connectedToWeb = true;
    socket.on("mobile-joined", () => {
      connectedToMobile = true;
      updateStatusUI();
    });
    socket.on("mobile-disconnected", () => {
      connectedToMobile = false;
      updateStatusUI();
    });
  } else if (currentRole === "mobile") {
    connectedToMobile = true;
    socket.on("web-joined", () => {
      connectedToWeb = true;
      updateStatusUI();
    });
    socket.on("web-disconnected", () => {
      connectedToWeb = false;
      updateStatusUI();
    });
  }

  updateStatusUI();
}

// expose for import
window.FallbackUI = {
  init(socket, role) {
    simulateFallback(socket, role);
  }
};