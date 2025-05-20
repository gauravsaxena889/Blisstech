export function loadPlugins() {
  console.log("🔌 Plugin loader initialized");

  // Example: dynamically load chat.js
  import('./chat.js').then(mod => {
    if (typeof mod.init === 'function') {
      mod.init(socket);
    }
  });
}
