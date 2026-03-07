import { render, screen } from '@testing-library/react';
import { NextStepsList } from '@/components/interview/next-steps-list';

describe('NextStepsList', () => {
  it('renders all steps with numbers', () => {
    const steps = ['Talk to 5 more users', 'Build prototype', 'Test pricing'];
    render(<NextStepsList steps={steps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Talk to 5 more users')).toBeInTheDocument();
    expect(screen.getByText('Build prototype')).toBeInTheDocument();
    expect(screen.getByText('Test pricing')).toBeInTheDocument();
  });

  it('returns null for empty steps', () => {
    const { container } = render(<NextStepsList steps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('has accessible list role', () => {
    render(<NextStepsList steps={['Do something']} />);
    expect(screen.getByRole('list', { name: /next steps/i })).toBeInTheDocument();
  });
});
