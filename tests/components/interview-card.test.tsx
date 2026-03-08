import { render, screen } from '@testing-library/react';
import { InterviewCard } from '@/components/interview/interview-card';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock date-fns format to avoid timezone issues in CI
jest.mock('date-fns', () => ({
  format: () => 'Mar 7, 2026',
}));

describe('InterviewCard', () => {
  const defaultProps = {
    id: 'test-id-1',
    participantName: 'Jane Doe',
    topic: 'SaaS for pet owners',
    status: 'active' as const,
    durationSeconds: null,
    createdAt: '2026-03-07T10:00:00Z',
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders participant name and topic', () => {
    render(<InterviewCard {...defaultProps} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('SaaS for pet owners')).toBeInTheDocument();
  });

  it('renders Active badge for active status', () => {
    render(<InterviewCard {...defaultProps} status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders Completed badge for completed status', () => {
    render(<InterviewCard {...defaultProps} status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Analyzed badge for analyzed status', () => {
    render(<InterviewCard {...defaultProps} status="analyzed" />);
    expect(screen.getByText('Analyzed')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<InterviewCard {...defaultProps} />);
    expect(screen.getByText('Mar 7, 2026')).toBeInTheDocument();
  });

  it('renders duration when provided', () => {
    render(<InterviewCard {...defaultProps} durationSeconds={185} />);
    expect(screen.getByText('3:05')).toBeInTheDocument();
  });

  it('does not render duration when null', () => {
    render(<InterviewCard {...defaultProps} durationSeconds={null} />);
    expect(screen.queryByText(/:[\d]{2}/)).not.toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<InterviewCard {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /Interview with Jane Doe — Active/ })
    ).toBeInTheDocument();
  });

  it('navigates to interview page on click for active interviews', () => {
    render(<InterviewCard {...defaultProps} status="active" />);
    screen.getByRole('button').click();
    expect(mockPush).toHaveBeenCalledWith('/interview/test-id-1');
  });

  it('navigates to report page on click for analyzed interviews', () => {
    render(<InterviewCard {...defaultProps} status="analyzed" />);
    screen.getByRole('button').click();
    expect(mockPush).toHaveBeenCalledWith('/dashboard/test-id-1/report');
  });
});
