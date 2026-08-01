import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-white text-black font-semibold',
        secondary: 'border-transparent bg-[#27272a] text-white hover:bg-[#3f3f46]',
        outline: 'border-[#3f3f46] text-white bg-transparent',
        destructive: 'border-transparent bg-red-900/40 text-red-300 border-red-800/50',
        success: 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300',
        accent: 'border-indigo-800/50 bg-indigo-950/40 text-indigo-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

