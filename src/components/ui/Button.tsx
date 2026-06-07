import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn',
          variant === 'primary' && 'btn--primary',
          variant === 'outline' && 'btn--outline',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <span className="btn-spinner" />}
        {!isLoading && children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
