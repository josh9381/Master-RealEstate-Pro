import api from './api'

/**
 * Utility to register for browser push notifications.
 * 1. Fetches VAPID public key from backend
 * 2. Registers the service worker
 * 3. Subscribes to push via the Push API
 * 4. Sends the subscription to the backend
 */

let swRegistration: ServiceWorkerRegistration | null = null

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  return Notification.permission
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  return Notification.requestPermission()
}

export async function registerPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported in this browser')
    return false
  }

  try {
    // 1. Register service worker
    swRegistration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service worker registered:', swRegistration.scope)

    // Wait for SW to be ready
    await navigator.serviceWorker.ready

    // 2. Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Push notification permission denied')
      return false
    }

    // 3. Get VAPID public key from server
    const keyResponse = await api.get('/push/vapid-key')
    const vapidPublicKey = keyResponse.data?.data?.publicKey
    if (!vapidPublicKey) {
      console.warn('VAPID public key not available')
      return false
    }

    // 4. Subscribe to push
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    // 5. Send subscription to backend
    const subJSON = subscription.toJSON()
    await api.post('/push/subscribe', {
      endpoint: subJSON.endpoint,
      keys: {
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth,
      },
    })

    console.log('Push notification subscription registered')
    return true
  } catch (error) {
    console.error('Failed to register push notifications:', error)
    return false
  }
}

export async function unregisterPush(): Promise<boolean> {
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.getRegistration('/sw.js') || null
    }

    if (!swRegistration) return true

    const subscription = await swRegistration.pushManager.getSubscription()
    if (subscription) {
      // Tell backend to remove
      await api.delete('/push/subscribe', {
        data: { endpoint: subscription.endpoint },
      })
      // Unsubscribe locally
      await subscription.unsubscribe()
    }

    return true
  } catch (error) {
    console.error('Failed to unregister push notifications:', error)
    return false
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false

    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return false

    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

// Listen for notification click messages from the service worker
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
      // Navigate to the URL from the notification
      window.location.href = event.data.url
    }
  })
}
