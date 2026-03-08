import { render, screen } from '@testing-library/react';
import { ValidationScore } from '@/components/interview/validation-score';

describe('ValidationScore', () => {
  it('renders score value', () => {
    render(<ValidationScore score={75} />);
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('shows Strong Validation for score >= 70', () => {
    render(<ValidationScore score={85} />);
    expect(screen.getByText('Strong Validation')).toBeInTheDocument();
  });

  it('shows Moderate Validation for score 40-69', () => {
    render(<ValidationScore score={55} />);
    expect(screen.getByText('Moderate Validation')).toBeInTheDocument();
  });

  it('shows Weak Validation for score < 40', () => {
    render(<ValidationScore score={25} />);
    expect(screen.getByText('Weak Validation')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<ValidationScore score={72} />);
    expect(
      screen.getByRole('img', { name: /Validation score: 72 out of 100/ })
    ).toBeInTheDocument();
  });
});
