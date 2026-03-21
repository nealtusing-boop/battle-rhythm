import webpush from 'web-push';

let configured = false;

export function ensurePushConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      'Push notifications are not configured. Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBJECT.'
    );
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
}

export { webpush };