
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Ricezione delle notifiche push
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "CRM",
      body: event.data ? event.data.text() : "Nuovo promemoria"
    };
  }

  const title = data.title || "CRM Arredo Bagno";

  const options = {
    body: data.body || "Hai un nuovo promemoria",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "crm-notifica",
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Apertura del CRM quando tocchi una notifica
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  if (url.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.openWindow(url.href)
  );
});
