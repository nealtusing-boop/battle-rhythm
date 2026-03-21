import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicKey && privateKey && subject) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function ensurePushConfigured() {
  if (!publicKey || !privateKey || !subject) {
    throw new Error('Missing VAPID environment variables for push notifications.');
  }
}

export { webpush };
