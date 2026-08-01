import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-white text-black font-semibold shadow-xs hover:bg-neutral-200 active:bg-neutral-300',
        secondary: 'bg-[#27272a] text-white hover:bg-[#3f3f46] active:bg-[#52525b]',
        outline: 'border border-[#3f3f46] bg-transparent text-white hover:bg-[#27272a]',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        ghost: 'text-neutral-400 hover:bg-[#27272a] hover:text-white',
        link: 'text-white underline-offset-4 hover:underline',
        glow: 'bg-white text-black font-semibold hover:bg-neutral-200 shadow-md shadow-white/10',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6 text-sm',
        icon: 'h-9 w-9 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

