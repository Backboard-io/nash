import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { useMediaQuery } from '@librechat/client';
import type { TModelTier } from 'librechat-data-provider';
import { getConfigDefaults } from 'librechat-data-provider';
import type { ModelSelectorProps } from '~/common';
import {
  renderModelSpecs,
  renderEndpoints,
  renderSearchResults,
  renderCustomGroups,
} from './components';
import { ModelSelectorProvider, useModelSelectorContext } from './ModelSelectorContext';
import { ModelSelectorChatProvider } from './ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from './utils';
import { CustomMenu as Menu } from './CustomMenu';
import DialogManager from './DialogManager';
import { useLocalize } from '~/hooks';

const tierOptions: Array<{ value: TModelTier; label: string; description: string }> = [
  { value: 'free', label: 'Free', description: 'Open Source' },
  { value: 'fast', label: 'Fast', description: 'Low Latency' },
  { value: 'powerful', label: 'Powerful', description: 'Deep Reasoning' },
];

function ModelSelectorContent() {
  const localize = useLocalize();
  const isCompactTrigger = useMediaQuery('(max-width: 900px)');

  const {
    // LibreChat
    agentsMap,
    modelSpecs,
    mappedEndpoints,
    filteredMappedEndpoints,
    endpointsConfig,
    // State
    searchValue,
    searchResults,
    selectedValues,
    activeTier,
    // Functions
    setSearchValue,
    setSelectedValues,
    setActiveTier,
    // Dialog
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
  } = useModelSelectorContext();
  const hasTierFilters = useMemo(
    () => mappedEndpoints.some((endpoint) => endpoint.models?.some((model) => (model.tiers?.length ?? 0) > 0)),
    [mappedEndpoints],
  );

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig],
  );
  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        agentsMap,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, agentsMap, modelSpecs, selectedValues, mappedEndpoints],
  );
  const triggerLabel = isCompactTrigger ? localize('com_ui_model') : selectedDisplayValue;

  const trigger = (
    <TooltipAnchor
      aria-label={localize('com_ui_select_model')}
      description={localize('com_ui_select_model')}
      render={
        <button
          className="my-1 flex h-10 w-auto min-w-[112px] max-w-[160px] items-center justify-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary hover:bg-surface-active-alt sm:max-w-[70vw] md:w-full md:max-w-[70vw]"
          aria-label={localize('com_ui_select_model')}
        >
          {selectedIcon && React.isValidElement(selectedIcon) && (
            <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
              {selectedIcon}
            </div>
          )}
          <span className="flex-grow truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-secondary" aria-hidden="true" />
        </button>
      }
    />
  );

  return (
    <div className="relative flex w-auto max-w-md flex-col items-center gap-2 md:w-full">
      <Menu
        values={selectedValues}
        onValuesChange={(values: Record<string, any>) => {
          setSelectedValues({
            endpoint: values.endpoint || '',
            model: values.model || '',
            modelSpec: values.modelSpec || '',
          });
        }}
        onSearch={(value) => setSearchValue(value)}
        combobox={<input id="model-search" placeholder=" " />}
        comboboxLabel={localize('com_endpoint_search_models')}
        trigger={trigger}
      >
        {hasTierFilters && (
          <div className="flex flex-wrap gap-2 border-b border-border-light px-3 pb-2 pt-1">
            {tierOptions.map((tier) => {
              const isActive = activeTier === tier.value;
              return (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setActiveTier(isActive ? null : tier.value)}
                  className={[
                    'rounded-full border px-3 py-1 text-left text-xs transition-colors',
                    isActive
                      ? 'border-text-primary bg-surface-active-alt text-text-primary'
                      : 'border-border-light bg-transparent text-text-secondary hover:bg-surface-hover',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  <span className="font-medium">{tier.label}</span>
                  <span className="ml-1 opacity-75">({tier.description})</span>
                </button>
              );
            })}
          </div>
        )}
        {searchResults ? (
          renderSearchResults(searchResults, localize, searchValue)
        ) : (
          <>
            {/* Render ungrouped modelSpecs (no group field) */}
            {!activeTier &&
              renderModelSpecs(
                modelSpecs?.filter((spec) => !spec.group) || [],
                selectedValues.modelSpec || '',
              )}
            {/* Render endpoints (will include grouped specs matching endpoint names) */}
            {renderEndpoints(filteredMappedEndpoints ?? [])}
            {/* Render custom groups (specs with group field not matching any endpoint) */}
            {!activeTier && renderCustomGroups(modelSpecs || [], filteredMappedEndpoints ?? [])}
          </>
        )}
      </Menu>
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
    </div>
  );
}

export default function ModelSelector({ startupConfig }: ModelSelectorProps) {
  const interfaceConfig = startupConfig?.interface ?? getConfigDefaults().interface;
  const modelSpecs = startupConfig?.modelSpecs?.list ?? [];

  // Hide the selector when modelSelect is false and there are no model specs to show
  if (interfaceConfig.modelSelect === false && modelSpecs.length === 0) {
    return null;
  }

  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <ModelSelectorContent />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
