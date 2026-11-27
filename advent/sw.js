/* Family Crazy Adventskalender: alleen voor meldingen. Er wordt niets gecachet, zodat je altijd de nieuwste versie ziet. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { tekst: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titel || "Family Crazy Adventskalender", {
    body: d.tekst || "",
    icon: "icoon-192.png",
    badge: "icoon-192.png",
    tag: "advent",
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lijst) => {
    for (const c of lijst) if ("focus" in c) return c.focus();
    return self.clients.openWindow(e.notification.data.url || "./");
  }));
});
