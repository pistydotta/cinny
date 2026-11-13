import { Box, Icon, Icons } from 'folds';
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { PasswordResetForm } from './PasswordResetForm';
import { ResetPasswordPathSearchParams } from '../../paths';
import { tr } from '../../../features/translation/tr';
import { AuthSecondary } from '../../../features/auth-card';

const useResetPasswordSearchParams = (
  searchParams: URLSearchParams
): ResetPasswordPathSearchParams =>
  useMemo(
    () => ({
      email: searchParams.get('email') ?? undefined,
    }),
    [searchParams]
  );

export function ResetPassword() {
  const server = useAuthServer();
  const [searchParams] = useSearchParams();
  const resetPasswordSearchParams = useResetPasswordSearchParams(searchParams);

  return (
    <Box direction="Column" gap="300">
      <PasswordResetForm defaultEmail={resetPasswordSearchParams.email} />
      <Link to={getLoginPath(server)} className={AuthSecondary}>
        <Icon size="100" src={Icons.ArrowLeft} />
        {tr('reset_password.back', 'Back to login')}
      </Link>
    </Box>
  );
}
