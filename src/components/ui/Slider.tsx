import React from 'react';
import { cn } from './Button';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex justify-between">
            <label className="text-sm font-medium">{label}</label>
            <span className="text-sm text-zinc-500">{props.value}</span>
          </div>
        )}
        <input
          type="range"
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-50',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';
