import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      hover = false,
      padding = 'md',
      header,
      footer,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          glass shadow-glass rounded-glass
          ${paddingStyles[padding]}
          ${hover ? 'cursor-pointer transition-all duration-200 hover:shadow-glass-lg hover:-translate-y-0.5' : ''}
          ${className}
        `}
        {...props}
      >
        {header && (
          <div className="mb-4 pb-4 border-b border-[var(--border-subtle)]">
            {header}
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
