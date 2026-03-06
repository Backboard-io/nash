import { useMemo, useState } from 'react';
import { Copy, Gift, Sparkles, Ticket, Users } from 'lucide-react';
import { registerPage } from 'librechat-data-provider';
import { useToastContext } from '@librechat/client';
import { useAuthContext, useLocalize } from '~/hooks';
import {
  useGetReferralSummary,
  useGetStartupConfig,
  useRedeemReferralOrPromoCode,
} from '~/data-provider';
import { cn } from '~/utils';

type ReferralPanelProps = {
  variant?: 'settings' | 'hero' | 'login';
  showRedeem?: boolean;
  className?: string;
};

function formatCredits(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default function ReferralPanel({
  variant = 'settings',
  showRedeem = false,
  className,
}: ReferralPanelProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { data, isLoading } = useGetReferralSummary({
    enabled: isAuthenticated && startupConfig?.referrals?.enabled === true,
  });
  const redeemMutation = useRedeemReferralOrPromoCode();
  const [code, setCode] = useState('');

  const rewardUsd = data?.rewardUsd ?? startupConfig?.referrals?.rewardUsd ?? 5;
  const registerHref = useMemo(() => {
    if (typeof window === 'undefined' || !window.location.search) {
      return registerPage();
    }
    return `${registerPage()}${window.location.search}`;
  }, []);

  const handleCopy = async () => {
    if (!data?.referralLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(data.referralLink);
      showToast({ message: 'Referral link copied', status: 'success' });
    } catch (error) {
      showToast({ message: 'Could not copy referral link', status: 'error' });
    }
  };

  const handleRedeem = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      return;
    }
    redeemMutation.mutate(trimmed, {
      onSuccess: (result) => {
        const message =
          result.kind === 'promo'
            ? `Promo applied: ${formatCredits(result.tokenCreditsAwarded ?? 0)} credits added`
            : 'Referral code linked to your account';
        showToast({ message, status: 'success' });
        setCode('');
      },
      onError: (error) => {
        showToast({ message: error.message || 'Could not redeem code', status: 'error' });
      },
    });
  };

  const shellClassName =
    variant === 'hero'
      ? 'overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-background to-amber-500/10 p-5 shadow-[0_20px_80px_-40px_rgba(139,92,246,0.7)]'
      : variant === 'login'
        ? 'rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10 p-5'
        : 'rounded-2xl border border-border-light bg-surface-secondary/60 p-4';

  if (!startupConfig?.referrals?.enabled) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className={cn(shellClassName, className)}>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-500/15 p-2 text-violet-500">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Referral rewards</p>
            <p className="mt-1 text-sm text-text-secondary">
              Invite friends once you&apos;re in. Earn ${rewardUsd.toFixed(2)} in token credits when a referral
              upgrades to a paid account.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={registerHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4" />
            Start sharing invites
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(shellClassName, className)}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-violet-500/15 p-2 text-violet-500">
          <Gift className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">Referral rewards</p>
            {data?.referredByCode && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Referred by {data.referredByCode}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Earn ${rewardUsd.toFixed(2)} in token credits whenever one of your invited betas upgrades.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 text-sm text-text-secondary">Loading referral rewards...</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-light bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
                <Ticket className="h-3.5 w-3.5" />
                Your code
              </div>
              <div className="mt-2 text-lg font-semibold tracking-[0.18em] text-text-primary">
                {data?.referralCode ?? '...'}
              </div>
            </div>
            <div className="rounded-2xl border border-border-light bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
                <Users className="h-3.5 w-3.5" />
                Signups
              </div>
              <div className="mt-2 text-lg font-semibold text-text-primary">{data?.stats.signups ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-border-light bg-background/70 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
                <Sparkles className="h-3.5 w-3.5" />
                Paid conversions
              </div>
              <div className="mt-2 text-lg font-semibold text-text-primary">
                {data?.stats.paidConversions ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-violet-700"
            >
              <Copy className="h-4 w-4" />
              Copy invite link
            </button>
            {data?.referralLink && (
              <span className="truncate rounded-2xl border border-border-light px-3 py-2 text-xs text-text-secondary">
                {data.referralLink}
              </span>
            )}
          </div>

          {showRedeem && (
            <div className="mt-4 rounded-2xl border border-border-light bg-background/70 p-3">
              <label className="block text-sm font-medium text-text-primary">Redeem promo code</label>
              <p className="mt-1 text-xs text-text-secondary">
                Claim a promo credit code or attach a referral code if you signed up without one.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 rounded-2xl border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeemMutation.isLoading || code.trim().length === 0}
                  className="rounded-2xl border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-400"
                >
                  {redeemMutation.isLoading ? localize('com_ui_saving') : localize('com_ui_submit')}
                </button>
              </div>
            </div>
          )}

          {variant === 'settings' && data?.recentReferrals?.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Recent referrals</p>
              {data.recentReferrals.map((referral) => (
                <div
                  key={referral.userId}
                  className="flex items-center justify-between rounded-2xl border border-border-light bg-background/70 px-3 py-2 text-sm"
                >
                  <span className="text-text-primary">{referral.name}</span>
                  <span className="text-text-secondary">
                    {referral.rewardGrantedAt ? 'Rewarded' : 'Signed up'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
