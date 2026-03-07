// Implements #5: Interview Setup screen
import { InterviewSetupForm } from '@/components/interview/interview-setup-form';

export default function NewInterviewPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold font-heading text-[var(--text-primary)] mb-6 text-center">
          Start New Interview
        </h1>
        <InterviewSetupForm />
      </div>
    </main>
  );
}
