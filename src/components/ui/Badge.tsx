import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: string;
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}
