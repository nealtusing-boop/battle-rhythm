import { requireAdmin } from '@/lib/auth';
import { AdminClient } from '@/components/admin-client';

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: '#ffffff',
          }}
        >
          Admin Panel
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Manage schedules, alerts, leave, jumps, manifests, and CQ for the platoon.
        </p>
      </section>

      <AdminClient />
    </div>
  );
}