/**
 * notificationService.ts
 * Browser Notification API wrapper for KrishiMitra reminders.
 *
 * - Safe permission request
 * - Show notifications with icon
 * - Graceful fallback when denied / unsupported
 */

const ICON_PATH = '/icon-192.png' // put your app icon here (or use any public asset)

/** True if the Notification API is available in this browser. */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Current notification permission state. */
export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Returns true if we can show notifications right now. */
export function canNotify(): boolean {
  return isNotificationSupported() && Notification.permission === 'granted'
}

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 * Safe to call even if already granted/denied.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission

  try {
    const result = await Notification.requestPermission()
    return result
  } catch {
    return 'denied'
  }
}

/**
 * Send a browser notification.
 * Silently does nothing if permission is not granted or API is unavailable.
 */
export function sendNotification(
  title: string,
  body: string,
  options?: { tag?: string; silent?: boolean },
): void {
  if (!canNotify()) return

  try {
    new Notification(title, {
      body,
      icon: ICON_PATH,
      badge: ICON_PATH,
      tag: options?.tag,
      silent: options?.silent ?? true,
    })
  } catch {
    // Some browsers throw if called without a service worker in certain contexts
  }
}
