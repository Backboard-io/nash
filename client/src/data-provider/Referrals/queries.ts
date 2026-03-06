import { QueryKeys, dataService } from 'librechat-data-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type { TPromoCode, TReferralSummary, TRedeemCodeResponse } from 'librechat-data-provider';

export const useGetReferralSummary = (
  config?: UseQueryOptions<TReferralSummary>,
): QueryObserverResult<TReferralSummary> => {
  return useQuery<TReferralSummary>(
    [QueryKeys.referrals],
    () => dataService.getReferralSummary(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
      ...config,
    },
  );
};

export const useRedeemReferralOrPromoCode = () => {
  const queryClient = useQueryClient();
  return useMutation<TRedeemCodeResponse, Error, string>(
    (code: string) => dataService.redeemReferralOrPromoCode(code),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.referrals]);
        queryClient.invalidateQueries([QueryKeys.balance]);
      },
    },
  );
};

export const useGetAdminPromoCodes = (
  config?: UseQueryOptions<{ promoCodes: TPromoCode[] }>,
): QueryObserverResult<{ promoCodes: TPromoCode[] }> => {
  return useQuery<{ promoCodes: TPromoCode[] }>(
    [QueryKeys.adminPromoCodes],
    () => dataService.getAdminPromoCodes(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
      ...config,
    },
  );
};

export const useCreateAdminPromoCode = () => {
  const queryClient = useQueryClient();
  return useMutation<
    TPromoCode,
    Error,
    { code: string; usdValue?: number; tokenCreditsAwarded?: number; maxUses?: number; active?: boolean }
  >((payload) => dataService.createAdminPromoCode(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.adminPromoCodes]);
    },
  });
};
