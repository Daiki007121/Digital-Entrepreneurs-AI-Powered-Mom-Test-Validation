'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <p className="text-sm text-text-muted">
            Signed in as <strong>{user?.email ?? 'loading...'}</strong>
          </p>
        </Card>

        <Card>
          <p className="text-text-muted">
            No interviews yet. The interview flow will be built in Plan 3.
          </p>
        </Card>
      </div>
    </div>
  );
}
