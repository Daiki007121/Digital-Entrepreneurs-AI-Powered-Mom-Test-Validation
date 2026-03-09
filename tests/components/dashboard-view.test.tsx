import { render, screen } from '@testing-library/react';
import { DashboardView } from '@/components/interview/dashboard-view';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('date-fns', () => ({
  format: () => 'Mar 7, 2026',
}));

const mockInterviews = [
  {
    id: '1',
    participant_name: 'Alice',
    topic: 'Marketplace for tutors',
    target_user: 'students',
    status: 'analyzed',
    duration_seconds: 600,
    created_at: '2026-03-07T10:00:00Z',
    updated_at: '2026-03-07T10:10:00Z',
  },
  {
    id: '2',
    participant_name: 'Bob',
    topic: 'SaaS for gyms',
    target_user: 'gym owners',
    status: 'active',
    duration_seconds: null,
    created_at: '2026-03-06T09:00:00Z',
    updated_at: '2026-03-06T09:00:00Z',
  },
];

describe('DashboardView', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders empty state when no interviews', () => {
    render(<DashboardView interviews={[]} />);
    expect(screen.getByText('No interviews yet')).toBeInTheDocument();
    expect(screen.getByText(/Start your first Mom Test interview/)).toBeInTheDocument();
  });

  it('renders New Interview button in empty state', () => {
    render(<DashboardView interviews={[]} />);
    const btn = screen.getByRole('button', { name: /Start new interview/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockPush).toHaveBeenCalledWith('/interview/new');
  });

  it('renders interview cards when interviews exist', () => {
    render(<DashboardView interviews={mockInterviews} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Marketplace for tutors')).toBeInTheDocument();
    expect(screen.getByText('SaaS for gyms')).toBeInTheDocument();
  });

  it('renders FAB when interviews exist', () => {
    render(<DashboardView interviews={mockInterviews} />);
    const fab = screen.getByRole('button', { name: /Start new interview/i });
    expect(fab).toBeInTheDocument();
  });

  it('renders status badges correctly', () => {
    render(<DashboardView interviews={mockInterviews} />);
    expect(screen.getByText('Analyzed')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
