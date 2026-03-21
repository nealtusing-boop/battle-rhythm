import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { ensurePushConfigured, webpush } from '@/lib/push';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  ensurePushConfigured();

  const alert = await request.json();
  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await Promise.all(
    (subscriptions ?? []).map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: 'Battle Rhythm Alert',
            body: alert.message,
            priority: alert.priority,
            url: '/home',
          }),
        );
      } catch {
        await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }
    }),
  );

  return NextResponse.json({ ok: true });
}
