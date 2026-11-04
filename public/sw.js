
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
      body: event.data
        ? event.data.text()
        : "Nuovo promemoria"
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

  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  // Sicurezza: consentiamo soltanto URL del CRM
  if (target.origin !== self.location.origin) {
    return;
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    // Se il CRM è già aperto, riutilizziamo la finestra
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }

    // Altrimenti apriamo il CRM
    return self.clients.openWindow(target.href);
  })());
});
