import React, { ComponentProps, ForwardedRef, forwardRef } from 'react';
import { IconButton, Text, Tooltip, TooltipProvider } from 'folds';

type TipIconButtonProps = ComponentProps<typeof IconButton> & {
  label: string;
  // While the button's own menu is open the tip would sit on top of it.
  hideTip?: boolean;
};

const setRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) {
    const target = ref;
    target.current = value;
  }
};

// An icon alone often doesn't say what the button does. The label is also what screen readers get.
export const TipIconButton = forwardRef<HTMLButtonElement, TipIconButtonProps>(
  ({ label, hideTip, ...props }, ref) => (
    <TooltipProvider
      position="Top"
      delay={500}
      style={hideTip ? { display: 'none' } : undefined}
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
