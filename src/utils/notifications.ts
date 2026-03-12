import { decryptMessage } from './crypto';

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function showNotification(title: string, body: string, icon?: string, chatId?: string) {
  if (Notification.permission === "granted" && document.hidden) {
    const notification = new Notification(title, {
      body,
      icon: icon || '/logo192.png',
      tag: chatId || 'new-message',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}
