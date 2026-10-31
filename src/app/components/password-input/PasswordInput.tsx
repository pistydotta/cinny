import React, { ComponentProps, forwardRef } from 'react';
import { Icon, Input, config, Icons } from 'folds';
import { UseStateProvider } from '../UseStateProvider';
import { TipIconButton } from '../../features/tooltips/TipIconButton';
import { tr } from '../../features/translation/tr';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'size'> & {
  size: '400' | '500';
};
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ variant = 'Background', size, style, after, ...props }, ref) => {
    const paddingRight: string = size === '500' ? config.space.S300 : config.space.S200;

    return (
      <UseStateProvider initial={false}>
        {(visible, setVisible) => (
          <Input
            {...props}
            ref={ref}
            style={{ paddingRight, ...style }}
            type={visible ? 'text' : 'password'}
            size={size}
            variant={variant}
            after={
              <>
                {after}
                <TipIconButton
                  label={
                    visible
                      ? tr('tips.hide_password', 'Hide password')
                      : tr('tips.show_password', 'Show password')
                  }
                  onClick={() => setVisible(!visible)}
                  type="button"
                  variant={visible ? 'Warning' : variant}
                  size="300"
                  radii="300"
                >
                  <Icon
                    style={{ opacity: config.opacity.P300 }}
                    size="100"
                    src={visible ? Icons.Eye : Icons.EyeBlind}
                  />
                </TipIconButton>
              </>
            }
          />
        )}
      </UseStateProvider>
    );
  }
);
