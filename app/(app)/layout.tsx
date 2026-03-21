import { AppShell } from '@/components/app-shell';
import { getSessionProfile } from '@/lib/auth';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile(true);

  return <AppShell profile={session!.profile!}>{children}</AppShell>;
}
