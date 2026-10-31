import { createApiRequest } from '../../../utils/blazeroomApi';

export type Credits = {
  balance: number;
  /** Chips currently sitting at tables, not part of the balance. */
  atTables: number;
};

export const createCreditsApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async get(): Promise<Credits> {
      return (await (await request('/api/credits', 'GET')).json()) as Credits;
    },
    /** Refused with `at_table` while the user is seated anywhere. */
    async topUp(): Promise<number> {
      const res = await request('/api/credits/top-up', 'POST');
      return ((await res.json()) as { balance: number }).balance;
    },
  };
};

export type CreditsApi = ReturnType<typeof createCreditsApi>;
