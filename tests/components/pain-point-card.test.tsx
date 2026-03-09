import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { PainPointCard } from '@/components/interview/pain-point-card';
import type { PainPoint } from '@/types';

const mockPainPoint: PainPoint = {
  title: 'Manual scheduling is painful',
  severity: 'high',
  evidence: [
    'I spend 2 hours every week scheduling appointments manually',
    'We tried 3 different tools but none worked well',
  ],
};

describe('PainPointCard', () => {
  it('renders pain point title', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    expect(screen.getByText('Manual scheduling is painful')).toBeInTheDocument();
  });

  it('renders severity badge', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders index number', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={2} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show evidence by default', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    expect(screen.queryByText(/I spend 2 hours/)).not.toBeInTheDocument();
  });

  it('shows evidence when expanded', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText(/I spend 2 hours every week/)).toBeInTheDocument();
    expect(screen.getByText(/We tried 3 different tools/)).toBeInTheDocument();
  });

  it('hides evidence when collapsed again', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText(/I spend 2 hours/)).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.queryByText(/I spend 2 hours/)).not.toBeInTheDocument();
  });

  it('has correct aria-expanded attribute', () => {
    render(<PainPointCard painPoint={mockPainPoint} index={0} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
