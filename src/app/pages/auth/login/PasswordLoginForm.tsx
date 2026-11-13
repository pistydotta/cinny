import React, { FormEventHandler, useCallback } from 'react';
import { Box, Button, Input, Overlay, OverlayBackdrop, OverlayCenter, Spinner, Text } from 'folds';
import { MatrixError } from 'matrix-js-sdk';
import { getMxIdLocalPart, getMxIdServer, isUserId } from '../../../utils/matrix';
import { EMAIL_REGEX } from '../../../utils/regex';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {
  CustomLoginResponse,
  LoginError,
  factoryGetBaseUrl,
  login,
  useLoginComplete,
} from './loginUtil';
import { PasswordInput } from '../../../components/password-input';
import { FieldError } from '../FiledError';
import { tr } from '../../../features/translation/tr';
import { AuthField, AuthSubmit, PasskeyButton } from '../../../features/auth-card';

type PasswordLoginFormProps = {
  defaultUsername?: string;
  defaultEmail?: string;
};
export function PasswordLoginForm({ defaultUsername, defaultEmail }: PasswordLoginFormProps) {
  const clientConfig = useClientConfig();

  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;

  const [loginState, startLogin] = useAsyncCallback<
    CustomLoginResponse,
    MatrixError,
    Parameters<typeof login>
  >(useCallback(login, []));

  useLoginComplete(loginState.status === AsyncStatus.Success ? loginState.data : undefined);

  const handleUsernameLogin = (username: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: username,
      },
      password,
      initial_device_display_name: 'blazeroom Web',
    });
  };

  const handleMxIdLogin = async (mxId: string, password: string) => {
    const mxIdServer = getMxIdServer(mxId);
    const mxIdUsername = getMxIdLocalPart(mxId);
    if (!mxIdServer || !mxIdUsername) return;

    const getBaseUrl = factoryGetBaseUrl(clientConfig, mxIdServer);

    startLogin(getBaseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.user',
        user: mxIdUsername,
      },
      password,
      initial_device_display_name: 'blazeroom Web',
    });
  };
  const handleEmailLogin = (email: string, password: string) => {
    startLogin(baseUrl, {
      type: 'm.login.password',
      identifier: {
        type: 'm.id.thirdparty',
        medium: 'email',
        address: email,
      },
      password,
      initial_device_display_name: 'blazeroom Web',
    });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { usernameInput, passwordInput } = evt.target as HTMLFormElement & {
      usernameInput: HTMLInputElement;
      passwordInput: HTMLInputElement;
    };

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username) {
      usernameInput.focus();
      return;
    }
    if (!password) {
      passwordInput.focus();
      return;
    }

    if (isUserId(username)) {
      handleMxIdLogin(username, password);
      return;
    }
    if (EMAIL_REGEX.test(username)) {
      handleEmailLogin(username, password);
      return;
    }
    handleUsernameLogin(username, password);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="300">
      <Box direction="Column" gap="100">
        <Input
          defaultValue={defaultUsername ?? defaultEmail}
          name="usernameInput"
          placeholder={tr('login.username', 'Username')}
          aria-label={tr('login.username', 'Username')}
          autoComplete="username"
          className={AuthField}
          variant="Background"
          size="400"
          required
          outlined
        />
        {loginState.status === AsyncStatus.Error && (
          <>
            {loginState.error.errcode === LoginError.ServerNotAllowed && (
              <FieldError message="Login with custom server not allowed by your client instance." />
            )}
            {loginState.error.errcode === LoginError.InvalidServer && (
              <FieldError message="Failed to find your Matrix ID server." />
            )}
          </>
        )}
      </Box>
      <Box direction="Column" gap="100">
        <PasswordInput
          name="passwordInput"
          placeholder={tr('login.password', 'Password')}
          aria-label={tr('login.password', 'Password')}
          autoComplete="current-password"
          className={AuthField}
          variant="Background"
          size="400"
          outlined
          required
        />
        <Box alignItems="Start" justifyContent="SpaceBetween" gap="200">
          {loginState.status === AsyncStatus.Error && (
            <>
              {loginState.error.errcode === LoginError.Forbidden && (
                <FieldError message={tr('login.invalid', 'Wrong username or password.')} />
              )}
              {loginState.error.errcode === LoginError.UserDeactivated && (
                <FieldError message="This account has been deactivated." />
              )}
              {loginState.error.errcode === LoginError.InvalidRequest && (
                <FieldError message="Failed to login. Part of your request data is invalid." />
              )}
              {loginState.error.errcode === LoginError.RateLimited && (
                <FieldError message="Failed to login. Your login request has been rate-limited by server, Please try after some time." />
              )}
              {loginState.error.errcode === LoginError.Unknown && (
                <FieldError message="Failed to login. Unknown reason." />
              )}
            </>
          )}
        </Box>
      </Box>
      <Button type="submit" variant="Primary" size="400" className={AuthSubmit}>
        <Text as="span" size="B400">
          {tr('login.submit', 'Log in')}
        </Text>
      </Button>
      <PasskeyButton />

      <Overlay
        open={
          loginState.status === AsyncStatus.Loading || loginState.status === AsyncStatus.Success
        }
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <Spinner variant="Secondary" size="600" />
        </OverlayCenter>
      </Overlay>
    </Box>
  );
}
