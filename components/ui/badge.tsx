import type { ReactNode } from 'react';
import { CheckCircle, Clock, BarChart3, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

type BadgeVariant = 'default' | 'active' | 'completed' | 'analyzing' | 'analyzed' | 'warning' | 'error';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light',
  active:
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  completed:
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  analyzing:
    'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 animate-pulse',
  analyzed:
    'bg-cta/10 text-cta-dark dark:bg-cta/20 dark:text-cta-light',
  warning:
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  error:
    'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
};

const defaultIcons: Partial<Record<BadgeVariant, ReactNode>> = {
  active: <Clock className="h-3.5 w-3.5" />,
  completed: <CheckCircle className="h-3.5 w-3.5" />,
  analyzing: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  analyzed: <BarChart3 className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  error: <XCircle className="h-3.5 w-3.5" />,
};

export function Badge({
  variant = 'default',
  icon,
  children,
  className = '',
}: BadgeProps) {
  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-xs font-medium font-body
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {displayIcon && <span aria-hidden="true">{displayIcon}</span>}
      {children}
    </span>
  );
}
