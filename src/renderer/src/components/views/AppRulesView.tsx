// src/renderer/src/components/views/AppRulesView.tsx
import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmModal } from '../common/ConfirmModal';

export interface AppRuleItem {
  id: string;
  kind?: 'website' | 'app';
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
  onAddRule: (
    targetName: string,
    domainOrProcess: string,
    kind?: 'website' | 'app'
  ) => void;
  onDeleteRule: (id: string) => void;
}

export function resolveRuleKind(rule: AppRuleItem): 'website' | 'app' {
  if (rule.kind === 'app' || rule.kind === 'website') {
    return rule.kind;
  }
  return /\.(exe|app)$/i.test(rule.domainOrProcess.trim()) ? 'app' : 'website';
}

export const AppRulesView: React.FC<AppRulesViewProps> = ({
  rules,
  onToggleRuleEnabled,
  onToggleRuleStrict,
  onAddRule,
  onDeleteRule,
}) => {
  const { triggerOverlay } = useApp();

  const [targetKind, setTargetKind] = useState<'website' | 'app'>('website');
  const [customTagName, setCustomTagName] = useState<string>('');
  const [domainOrExecutable, setDomainOrExecutable] = useState<string>('');
  const [ruleToDelete, setRuleToDelete] = useState<AppRuleItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDesktopAppPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDomainOrExecutable(file.name);
    if (!customTagName.trim()) {
      const base = file.name.replace(/\.(exe|app|lnk|dmg)$/i, '');
      setCustomTagName(base);
    }
    e.target.value = '';
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagName.trim()) return;

    const fallbackTarget =
      targetKind === 'website'
        ? `${customTagName.trim().toLowerCase().replace(/\s+/g, '')}.com`
        : `${customTagName.trim().toLowerCase().replace(/\s+/g, '')}.exe`;

    onAddRule(
      customTagName.trim(),
      domainOrExecutable.trim() || fallbackTarget,
      targetKind
    );
    setCustomTagName('');
    setDomainOrExecutable('');
  };

  const handleTestSingleAppNudge = (rule: AppRuleItem) => {
    const cleanTarget =
      rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() || rule.targetName;
    triggerOverlay('overlay_intervention', {
      targetAppOrSite: cleanTarget,
      strictMode: rule.strictBlock,
    });
  };

  const watchedCount = rules.filter((r) => r.enabled).length;
  const filteredRules = rules.filter(
    (rule) => resolveRuleKind(rule) === targetKind
  );

  return (
    <div className="flex flex-col gap-5 p-6 text-white font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[22px] font-bold tracking-tight text-white">
            App & Website Intervention Rules
          </h2>
          <p className="mt-1 text-[13px] text-[#9490A8]">
            Configure which single apps or websites trigger Mambo&apos;s reminder overlay during active focus.
          </p>
        </div>

        <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 px-3.5 py-1 text-[12px] font-semibold">
          {watchedCount} {watchedCount === 1 ? 'target' : 'targets'} watched
        </span>
      </div>

      {/* Segmented Control (Filters list AND sets target kind for Add Target form) */}
      <form
        onSubmit={handleCreateRule}
        className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#2C253E] bg-[#181424] p-4"
      >
        <div className="flex rounded-xl bg-[#110E1A] p-1 border border-[#2C253E]">
          <button
            type="button"
            onClick={() => setTargetKind('website')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
              targetKind === 'website'
                ? 'bg-violet-600 !text-white shadow-sm'
                : 'text-[#9490A8] hover:text-white'
            }`}
          >
            Website
          </button>
          <button
            type="button"
            onClick={() => setTargetKind('app')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
              targetKind === 'app'
                ? 'bg-violet-600 !text-white shadow-sm'
                : 'text-[#9490A8] hover:text-white'
            }`}
          >
            Desktop App
          </button>
        </div>

        <input
          type="text"
          value={customTagName}
          onChange={(e) => setCustomTagName(e.target.value)}
          placeholder={
            targetKind === 'website'
              ? 'Custom Tag Name (e.g., YouTube)'
              : 'Custom Tag Name (e.g., Steam)'
          }
          className="flex-1 min-w-[200px] rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
        />

        <div className="flex flex-1 min-w-[220px] items-center gap-1.5">
          <input
            type="text"
            value={domainOrExecutable}
            onChange={(e) => setDomainOrExecutable(e.target.value)}
            placeholder={
              targetKind === 'website'
                ? 'Domain URL (e.g., youtube.com)'
                : 'Process / executable (e.g., steam.exe)'
            }
            className="w-full rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
          />

          {targetKind === 'app' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleDesktopAppPicked}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Browse local executable"
                className="shrink-0 rounded-xl border border-[#3B3354] bg-[#1E192D] px-3 py-2 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Browse…
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          className="rounded-xl bg-violet-600 !text-white px-4 py-2 text-[13px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer shadow-sm"
        >
          Add Target
        </button>
      </form>

      {/* Filtered Rules List or Honest Empty State */}
      <div className="flex flex-col gap-2.5">
        {filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#342C4C] bg-[#181424]/60 py-10 px-4 text-center">
            <p className="text-[14px] font-semibold text-[#C4B5FD]">
              {targetKind === 'website'
                ? 'No websites yet. Add one above.'
                : 'No desktop apps yet. Add one above.'}
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isApp = resolveRuleKind(rule) === 'app';
            const cleanPromptName =
              rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() ||
              rule.targetName;

            return (
              <div
                key={rule.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 transition ${
                  rule.enabled
                    ? 'border-[#322A4B] bg-[#181424]'
                    : 'border-[#221C33] bg-[#120F1D] opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 text-[15px] font-bold">
                    {isApp ? '💻' : '🌐'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-bold text-white">
                        {rule.targetName}
                      </span>

                      <span className="rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 px-2 py-0.5 text-[10.5px] font-medium">
                        {rule.domainOrProcess}
                      </span>

                      <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 px-2.5 py-0.5 text-[10px] font-medium">
                        {isApp ? 'Desktop App' : 'Website'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[#9490A8]">
                      Overlay prompt: &ldquo;No! Don&apos;t go on {cleanPromptName}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Strict (Close only) vs Default (Strict off) Tag */}
                  <button
                    type="button"
                    onClick={() => onToggleRuleStrict(rule.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ease-out cursor-pointer ${
                      rule.strictBlock
                        ? 'text-rose-900 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/40'
                        : 'text-zinc-800 bg-zinc-200 border border-zinc-300 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    {rule.strictBlock
                      ? 'Strict (Close only)'
                      : 'Default (Strict off)'}
                  </button>

                  {/* Instant Single-App Intervention Preview Button */}
                  <button
                    type="button"
                    onClick={() => handleTestSingleAppNudge(rule)}
                    className="rounded-lg border border-indigo-300 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:border-[#4E4187] dark:bg-[#261E42] dark:text-[#DDD8F3] dark:hover:bg-[#35295B] px-3 py-1 text-[11.5px] font-semibold transition-all duration-150 ease-out cursor-pointer"
                  >
                    Test &ldquo;{cleanPromptName}&rdquo;
                  </button>

                  {/* Enable Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    onClick={() => onToggleRuleEnabled(rule.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      rule.enabled ? 'bg-violet-600' : 'bg-[#2C253E]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Trash Icon Button (Stage 2) */}
                  <button
                    type="button"
                    aria-label="Delete rule"
                    title={`Delete ${rule.targetName}`}
                    onClick={() => setRuleToDelete(rule)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 dark:border-[#383052] bg-violet-50/70 dark:bg-[#1F1A30] text-violet-600 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 dark:text-[#C4B5FD] dark:hover:bg-rose-950/60 dark:hover:border-rose-800/50 dark:hover:text-rose-300 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Deleting a Rule */}
      <ConfirmModal
        isOpen={ruleToDelete !== null}
        title={`Delete ${ruleToDelete?.targetName ?? 'rule'}?`}
        description={`"${ruleToDelete?.targetName ?? ''}" (${
          ruleToDelete?.domainOrProcess ?? ''
        }) will be removed from your watched targets.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (ruleToDelete) {
            onDeleteRule(ruleToDelete.id);
            setRuleToDelete(null);
          }
        }}
        onCancel={() => setRuleToDelete(null)}
      />
    </div>
  );
};

export default AppRulesView;
