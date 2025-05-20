const socket = io(window.location.origin, { transports: ['websocket'] });
const params = new URLSearchParams(window.location.search);
const spaceId = params.get("spaceId");
const role = params.get("role") || "web";
const userId = params.get("userId") || crypto.randomUUID();

if (spaceId && role) {
  socket.emit("join-space", { spaceId, userId, role });
}

socket.on("connect", () => console.log("✅ Connected to server"));

socket.on("manual-ping", () => {
  console.log("📶 Ping received");
});

socket.on("web-disconnected", () => {
  console.log("🧭 Fallback to mobile triggered");
});

socket.on("mobile-disconnected-notice", () => {
  console.log("📲 Switch back to web suggested");
});
