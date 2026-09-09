import * as React from 'react';

import { cn } from '@/lib/utils';

interface CalendarChipProps {
  label: string;
  color: string;
  icon?: React.ReactNode;
  muted?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const CalendarChip = React.forwardRef<HTMLButtonElement, CalendarChipProps & React.HTMLAttributes<HTMLButtonElement>>(
  ({ label, color, icon, muted, className, onClick, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition-opacity hover:opacity-80',
        muted && 'opacity-50',
        className
      )}
      style={{ backgroundColor: `color-mix(in oklch, ${color} 20%, transparent)`, color }}
      title={label}
      {...rest}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
);
CalendarChip.displayName = 'CalendarChip';
