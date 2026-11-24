/* Mapa Comercial: só para mostrar os avisos de retorno (não guarda páginas em cache) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abertas) => {
    for (const c of abertas) { if (c.url.indexOf(self.registration.scope) === 0) { if (id) c.postMessage({ abrir: id }); return c.focus(); } }
    return self.clients.openWindow(self.registration.scope + (id ? "?abrir=" + encodeURIComponent(id) : ""));
  }));
});
