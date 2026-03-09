// Implements #10: Insight Report page (server component)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ValidationScore } from '@/components/interview/validation-score';
import { PainPointCard } from '@/components/interview/pain-point-card';
import { NextStepsList } from '@/components/interview/next-steps-list';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { PainPoint, AnalysisResult } from '@/types';

interface PageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: PageProps) {
  let user;
  try {
    user = await getAuthUser();
  } catch {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Fetch interview (verify ownership)
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select('id, participant_name, topic, target_user, status, duration_seconds, created_at, user_id')
    .eq('id', params.id)
    .single();

  if (interviewError || !interview || interview.user_id !== user.id) {
    redirect('/dashboard');
  }

  if (interview.status !== 'analyzed') {
    redirect('/dashboard');
  }

  // Fetch insight
  const { data: insight, error: insightError } = await supabase
    .from('insights')
    .select('*')
    .eq('interview_id', params.id)
    .single();

  if (insightError || !insight) {
    redirect('/dashboard');
  }

  const analysis: AnalysisResult | null = insight.raw_analysis
    ? (JSON.parse(insight.raw_analysis as string) as AnalysisResult)
    : null;

  const painPoints = (insight.pain_points as unknown as PainPoint[]) ?? [];
  const themes = (insight.themes as unknown as string[]) ?? [];
  const nextSteps = (insight.next_steps as unknown as string[]) ?? [];

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-body mb-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
            Insight Report
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)] font-body">
            {interview.participant_name} &mdash; {interview.topic}
          </p>
        </div>

        {/* Validation Score */}
        <Card padding="lg">
          <div className="flex justify-center">
            <ValidationScore score={insight.validation_score} />
          </div>
        </Card>

        {/* Pain Points */}
        {painPoints.length > 0 && (
          <section aria-labelledby="pain-points-heading">
            <h2
              id="pain-points-heading"
              className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-4"
            >
              Pain Points ({painPoints.length})
            </h2>
            <div className="space-y-3">
              {painPoints.map((point, index) => (
                <PainPointCard key={index} painPoint={point} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Themes */}
        {themes.length > 0 && (
          <section aria-labelledby="themes-heading">
            <h2
              id="themes-heading"
              className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-4"
            >
              Themes
            </h2>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme, index) => (
                <Badge key={index} variant="default">
                  {theme}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <section aria-labelledby="next-steps-heading">
            <h2
              id="next-steps-heading"
              className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-4"
            >
              Recommended Next Steps
            </h2>
            <Card>
              <NextStepsList steps={nextSteps} />
            </Card>
          </section>
        )}

        {/* Summary + Verdict */}
        {analysis && (
          <Card padding="lg">
            <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-3">
              Summary
            </h2>
            <p className="text-sm text-[var(--text-secondary)] font-body leading-relaxed mb-4">
              {analysis.summary}
            </p>
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-body">
                Verdict:
              </span>
              <Badge
                variant={
                  analysis.finalVerdict === 'VALIDATED'
                    ? 'analyzed'
                    : analysis.finalVerdict === 'PARTIALLY_VALIDATED'
                      ? 'completed'
                      : 'error'
                }
              >
                {analysis.finalVerdict.replace(/_/g, ' ')}
              </Badge>
            </div>
          </Card>
        )}

        {/* Back link */}
        <div className="pb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors font-body font-semibold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
