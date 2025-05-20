export function init(socket) {
  console.log("💬 Chat plugin initialized");

  // Example event binding
  socket.on("chat-message", (data) => {
    console.log("🗨️ Message received:", data);
  });

  // Example sending
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "chatInput") {
      socket.emit("chat-message", {
        spaceId,
        userId,
        message: e.target.value
      });
      e.target.value = '';
    }
  });
}
