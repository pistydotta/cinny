import React, { ComponentProps, ForwardedRef, forwardRef } from 'react';
import { IconButton, Text, Tooltip, TooltipProvider } from 'folds';

type TipIconButtonProps = ComponentProps<typeof IconButton> & { label: string };

const setRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) {
    const target = ref;
    target.current = value;
  }
};

// An icon alone often doesn't say what the button does. The label is also what screen readers get.
export const TipIconButton = forwardRef<HTMLButtonElement, TipIconButtonProps>(
  ({ label, ...props }, ref) => (
    <TooltipProvider
      position="Top"
      delay={500}
      tooltip={
        <Tooltip>
          <Text size="T200">{label}</Text>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <IconButton
          {...props}
          aria-label={label}
          ref={(element: HTMLButtonElement | null) => {
            setRef(ref, element);
            setRef(triggerRef as ForwardedRef<HTMLButtonElement>, element);
          }}
        />
      )}
    </TooltipProvider>
  )
);
