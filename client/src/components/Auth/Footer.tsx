import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { Constants, TStartupConfig } from 'librechat-data-provider';
import ReleaseNotesModal from '~/components/Chat/ReleaseNotesModal';

function Footer({ startupConfig }: { startupConfig: TStartupConfig | null | undefined }) {
  const localize = useLocalize();
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  if (!startupConfig) {
    return null;
  }
  const privacyPolicy = startupConfig.interface?.privacyPolicy;
  const termsOfService = startupConfig.interface?.termsOfService;

  const privacyPolicyRender = privacyPolicy?.externalUrl && (
    <a
      className="text-sm text-green-600 underline decoration-transparent transition-all duration-200 hover:text-green-700 hover:decoration-green-700 focus:text-green-700 focus:decoration-green-700 dark:text-green-500 dark:hover:text-green-400 dark:hover:decoration-green-400 dark:focus:text-green-400 dark:focus:decoration-green-400"
      href={privacyPolicy.externalUrl}
      // Removed for WCAG compliance
      // target={privacyPolicy.openNewTab ? '_blank' : undefined}
      rel="noreferrer"
    >
      {localize('com_ui_privacy_policy')}
    </a>
  );

  const termsOfServiceRender = termsOfService?.externalUrl && (
    <a
      className="text-sm text-green-600 underline decoration-transparent transition-all duration-200 hover:text-green-700 hover:decoration-green-700 focus:text-green-700 focus:decoration-green-700 dark:text-green-500 dark:hover:text-green-400 dark:hover:decoration-green-400 dark:focus:text-green-400 dark:focus:decoration-green-400"
      href={termsOfService.externalUrl}
      // Removed for WCAG compliance
      // target={termsOfService.openNewTab ? '_blank' : undefined}
      rel="noreferrer"
    >
      {localize('com_ui_terms_of_service')}
    </a>
  );

  return (
    <>
      <div className="align-end m-4 flex flex-wrap items-center justify-center gap-2 text-center" role="contentinfo">
        <button
          type="button"
          className="text-sm text-green-600 underline decoration-transparent transition-all duration-200 hover:text-green-700 hover:decoration-green-700 focus:text-green-700 focus:decoration-green-700 dark:text-green-500 dark:hover:text-green-400 dark:hover:decoration-green-400 dark:focus:text-green-400 dark:focus:decoration-green-400"
          onClick={() => setShowReleaseNotes(true)}
          title={`Open release notes for ${String(Constants.VERSION)}`}
        >
          {`Nash ${String(Constants.VERSION)}`}
        </button>
        {(privacyPolicyRender || termsOfServiceRender) && (
          <div className="h-4 border-r-[1px] border-gray-300 dark:border-gray-600" />
        )}
        {privacyPolicyRender}
        {privacyPolicyRender && termsOfServiceRender && (
          <div className="h-4 border-r-[1px] border-gray-300 dark:border-gray-600" />
        )}
        {termsOfServiceRender}
      </div>
      <ReleaseNotesModal
        open={showReleaseNotes}
        onOpenChange={setShowReleaseNotes}
        currentVersion={String(Constants.VERSION)}
      />
    </>
  );
}

export default Footer;
