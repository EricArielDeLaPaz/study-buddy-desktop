// src/renderer/src/components/views/AppRulesView.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export interface AppRuleItem {
  id: string;
  targetName: string;
  domainOrProcess: string;
  category: 'Social' | 'Video' | 'Chat' | 'Gaming';
  strictBlock: boolean;
  enabled: boolean;
}

export interface AppRulesViewProps {
  rules: AppRuleItem[];
  onToggleRuleEnabled: (id: string) => void;
  onToggleRuleStrict: (id: string) => void;
  onAddRule: (targetName: string, domainOrProcess: string) => void;
}

export const AppRulesView: React.FC<AppRulesViewProps> = ({
  rules,
  onToggleRuleEnabled,
  onToggleRuleStrict,
  onAddRule,
}) => {
  const { triggerOverlay } = useApp();
  const [newAppName, setNewAppName] = useState<string>('');
  const [newDomain, setNewDomain] = useState<string>('');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    onAddRule(
      newAppName.trim(),
      newDomain.trim() || `${newAppName.trim().toLowerCase()}.com`
    );
    setNewAppName('');
    setNewDomain('');
  };

  const handleTestSingleAppNudge = (rule: AppRuleItem) => {
    triggerOverlay('overlay_intervention', {
      targetAppOrSite: rule.targetName,
      strictMode: rule.strictBlock,
    });
  };

  return (
    <div className="flex flex-col gap-5 p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            App & Website Intervention Rules
          </h2>
          <p className="mt-1 text-[13px] text-[#9E97B8]">
            Configure which single apps or websites trigger Mambo&apos;s intervention overlay during active focus.
          </p>
        </div>

        <span className="rounded-full bg-[#261E42] border border-[#4E4187] px-3.5 py-1 text-[12px] font-semibold text-[#A594F9]">
          Blocking {rules.filter((r) => r.enabled).length} targets
        </span>
      </div>

      {/* Add Single App / Website Rule Form */}
      <form
        onSubmit={handleCreateRule}
        className="flex items-center gap-3 rounded-2xl border border-[#2C253E] bg-[#181424] p-4"
      >
        <input
          type="text"
          value={newAppName}
          onChange={(e) => setNewAppName(e.target.value)}
          placeholder="App or site name (e.g., Instagram, Steam)"
          className="flex-1 rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
        />
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="Domain or process (e.g., instagram.com)"
          className="flex-1 rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#5A5373] focus:border-[#A594F9] focus:outline-none select-text"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#A594F9] px-4 py-2 text-[13px] font-bold text-[#171329] hover:bg-[#B5A7FA] transition cursor-pointer"
        >
          Add Target
        </button>
      </form>

      {/* Rules List */}
      <div className="flex flex-col gap-2.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 transition ${
              rule.enabled
                ? 'border-[#322A4B] bg-[#181424]'
                : 'border-[#221C33] bg-[#120F1D] opacity-60'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#261E42] font-bold text-[#A594F9]">
                {rule.targetName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-white">
                    {rule.targetName}
                  </span>
                  <span className="rounded-md bg-[#231D35] px-2 py-0.5 text-[10.5px] font-medium text-[#9E97B8]">
                    {rule.domainOrProcess}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-[#8E87A8]">
                  Overlay prompt: &ldquo;No! Don&apos;t go on {rule.targetName}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Strict Mode Pill Toggle */}
              <button
                type="button"
                onClick={() => onToggleRuleStrict(rule.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  rule.strictBlock
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-200'
                    : 'border-[#383052] bg-[#1D182D] text-[#9E97B8] hover:text-white'
                }`}
              >
                {rule.strictBlock ? 'Strict (Close only)' : 'Default (Strict off)'}
              </button>

              {/* Instant Single-App Intervention Preview Button */}
              <button
                type="button"
                onClick={() => handleTestSingleAppNudge(rule)}
                className="rounded-lg border border-[#4E4187] bg-[#261E42] px-3 py-1 text-[11.5px] font-semibold text-[#DDD8F3] hover:bg-[#35295B] transition cursor-pointer"
              >
                Test &ldquo;{rule.targetName}&rdquo;
              </button>

              {/* Enable Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                onClick={() => onToggleRuleEnabled(rule.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  rule.enabled ? 'bg-[#A594F9]' : 'bg-[#2C253E]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[#151120] transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppRulesView;