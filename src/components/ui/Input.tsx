import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    // Generate a unique ID if none provided, useful for linking label to input
    const inputId = id || React.useId();

    return (
      <div className={cn('form-group', className)}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="input-wrapper">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'input-field',
              error && 'input-field--error'
            )}
            {...props}
          />
        </div>
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
