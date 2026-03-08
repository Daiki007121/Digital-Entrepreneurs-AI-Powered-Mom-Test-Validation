// Implements #8: Dashboard page (server component)
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserMenu } from '@/components/ui/user-menu';
import { DashboardView } from '@/components/interview/dashboard-view';

export default async function DashboardPage() {
  let user;
  try {
    user = await getAuthUser();
  } catch {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  const { data: interviews, error } = await supabase
    .from('interviews')
    .select('id, participant_name, topic, target_user, status, duration_seconds, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <DashboardView interviews={error ? [] : interviews ?? []} />
      </div>
    </div>
  );
}
