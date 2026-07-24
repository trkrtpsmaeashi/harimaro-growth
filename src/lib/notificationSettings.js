export const DEFAULT_NOTIFICATION_SETTINGS = {
  dailyEnabled: true,
  dailyTime: '21:00',
  weightEnabled: true,
  weightWeekday: 6,
  monthlyEnabled: true,
  monthlyTime: '20:00',
};

const STORAGE_KEY = 'harimaro-notification-settings';

export function loadNotificationSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...saved,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function saveNotificationSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function canShowBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!canShowBrowserNotifications()) return 'unsupported';
  return Notification.requestPermission();
}

export function showBrowserNotification(title, body) {
  if (!canShowBrowserNotifications()) return false;
  if (Notification.permission !== 'granted') return false;

  new Notification(title, {
    body,
    icon: '/favicon.ico',
  });

  return true;
}

export function weekdayLabel(value) {
  return ['日', '月', '火', '水', '木', '金', '土'][Number(value)] || '土';
}
