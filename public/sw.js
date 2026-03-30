/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications
// This file runs in the browser's service worker context

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'Master RealEstate Pro',
      body: event.data.text(),
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const url = event.notification.data?.url || '/'

  if (action === 'dismiss') return

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url,
            data: event.notification.data,
          })
          return
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
