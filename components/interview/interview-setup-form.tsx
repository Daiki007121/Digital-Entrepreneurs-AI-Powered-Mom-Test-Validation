// Implements #5: Interview Setup form with consent
'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FileText, Users, Target, CheckSquare } from 'lucide-react';

const interviewSetupSchema = z.object({
  participantName: z.string().min(1, 'Participant name is required').max(100),
  topic: z.string().min(1, 'Business idea is required').max(500),
  targetUser: z.string().min(1, 'Target user description is required').max(500),
  consent: z.literal(true, { error: 'Consent is required to proceed' }),
});

type InterviewSetupData = z.infer<typeof interviewSetupSchema>;

export function InterviewSetupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InterviewSetupData>({
    defaultValues: {
      participantName: '',
      topic: '',
      targetUser: '',
      consent: undefined as unknown as true,
    },
  });

  const consentChecked = watch('consent');

  const onSubmit = async (data: InterviewSetupData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: data.participantName.trim(),
          topic: data.topic.trim(),
          targetUser: data.targetUser.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to start interview');
      }

      const { id } = await res.json();
      router.push(`/interview/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label="Participant Name"
          placeholder="e.g. John Smith"
          icon={<Users className="h-4 w-4" />}
          error={errors.participantName?.message}
          {...register('participantName', {
            required: 'Participant name is required',
            maxLength: { value: 100, message: 'Max 100 characters' },
          })}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="topic"
            className="text-sm font-medium text-[var(--text-secondary)] font-body"
          >
            Business Idea / Topic
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-3 text-[var(--text-muted)]"
              aria-hidden="true"
            >
              <FileText className="h-4 w-4" />
            </span>
            <textarea
              id="topic"
              rows={3}
              placeholder="Describe your business idea or the topic you want to validate..."
              className={`
                w-full rounded-xl px-4 py-2.5 pl-10 text-base font-body resize-none
                bg-[var(--bg-surface)] backdrop-blur-glass
                border border-[var(--border-subtle)]
                text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)]
                transition-all duration-200
                focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.topic ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}
              `}
              aria-invalid={errors.topic ? 'true' : undefined}
              aria-describedby={errors.topic ? 'topic-error' : undefined}
              {...register('topic', {
                required: 'Business idea is required',
                maxLength: { value: 500, message: 'Max 500 characters' },
              })}
            />
          </div>
          {errors.topic && (
            <p id="topic-error" className="text-sm text-red-500 font-body" role="alert">
              {errors.topic.message}
            </p>
          )}
        </div>

        <Input
          label="Target User"
          placeholder="e.g. Small business owners who struggle with accounting"
          icon={<Target className="h-4 w-4" />}
          error={errors.targetUser?.message}
          {...register('targetUser', {
            required: 'Target user description is required',
            maxLength: { value: 500, message: 'Max 500 characters' },
          })}
        />

        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <input
            type="checkbox"
            id="consent"
            className="mt-0.5 h-5 w-5 cursor-pointer accent-[var(--cta)] rounded"
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            {...register('consent', {
              required: 'Consent is required to proceed',
            })}
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="consent"
              className="text-sm font-medium text-[var(--text-primary)] font-body cursor-pointer flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
              Recording Consent
            </label>
            <p className="text-xs text-[var(--text-muted)] font-body">
              I confirm the participant has consented to being recorded and transcribed by AI.
            </p>
            {errors.consent && (
              <p id="consent-error" className="text-xs text-red-500 font-body" role="alert">
                {errors.consent.message}
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          disabled={!consentChecked}
          className="w-full mt-2"
          aria-label="Start interview session"
        >
          Start Interview
        </Button>
      </form>
    </Card>
  );
}
