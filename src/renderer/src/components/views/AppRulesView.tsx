// src/renderer/src/components/views/AppRulesView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  isLikelyLauncherExecutable,
  normalizeAppTagName,
  normalizeAppTarget,
} from '../../utils/appTarget';
import type { RunningOpenAppItem } from '../../../../preload/index.d';

export interface AppRuleItem {
  id: string;
  kind?: 'website' | 'app';
  targetName: string;
  domainOrProcess: string;
  processName?: string;
  bundleId?: string;
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
    kind?: 'website' | 'app',
    processName?: string,
    bundleId?: string
  ) => void;
  onDeleteRule: (id: string) => void;
}

export function resolveRuleKind(rule: AppRuleItem): 'website' | 'app' {
  if (rule.kind === 'app' || rule.kind === 'website') {
    return rule.kind;
  }
  const raw = (rule.domainOrProcess ?? '').trim();
  if (
    /\.(exe|app|lnk|dmg|appimage)["']?$/i.test(raw) ||
    raw.includes('\\') ||
    raw.startsWith('/')
  ) {
    return 'app';
  }
  return 'website';
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
  const [inspectedProcessName, setInspectedProcessName] = useState<string>('');
  const [inspectedBundleId, setInspectedBundleId] = useState<
    string | undefined
  >(undefined);
  const [launcherWarning, setLauncherWarning] = useState<string | null>(null);

  // "Choose from open apps" state (kept in memory only)
  const [isOpenAppsDrawerOpen, setIsOpenAppsDrawerOpen] =
    useState<boolean>(false);
  const [openAppsList, setOpenAppsList] = useState<RunningOpenAppItem[]>([]);
  const [isLoadingOpenApps, setIsLoadingOpenApps] = useState<boolean>(false);

  // "Add the app I am in now" 3-second countdown state
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);

  const [ruleToDelete, setRuleToDelete] = useState<AppRuleItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute the normalized process name that will be watched for Desktop App rules
  const computedWillWatchProcessName = React.useMemo(() => {
    if (targetKind !== 'app') return '';
    if (inspectedProcessName) return inspectedProcessName;
    if (domainOrExecutable.trim()) {
      return normalizeAppTarget(domainOrExecutable).processName;
    }
    if (customTagName.trim()) {
      return normalizeAppTagName(customTagName);
    }
    return '';
  }, [targetKind, inspectedProcessName, domainOrExecutable, customTagName]);

  // Check if manually typed/pasted path looks like Update.exe / Setup.exe / Launcher.exe
  useEffect(() => {
    if (targetKind !== 'app') {
      setLauncherWarning(null);
      return;
    }
    if (
      domainOrExecutable.trim() &&
      isLikelyLauncherExecutable(domainOrExecutable)
    ) {
      setLauncherWarning(
        "This looks like a launcher. Open the app and use 'Choose from open apps' instead."
      );
    }
  }, [targetKind, domainOrExecutable]);

  // 3-second countdown effect for "Add the app I am in now"
  useEffect(() => {
    if (captureCountdown === null) return;

    if (captureCountdown > 0) {
      const timer = window.setTimeout(() => {
        setCaptureCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => window.clearTimeout(timer);
    }

    // Countdown reached 0: read foreground process from main
    let cancelled = false;
    (async () => {
      try {
        const fgApp = await window.electronAPI?.captureForegroundApp?.();
        if (cancelled) return;
        if (fgApp && fgApp.processName) {
          setCustomTagName(fgApp.rawProcessName || fgApp.processName);
          setDomainOrExecutable(fgApp.rawProcessName || fgApp.processName);
          setInspectedProcessName(fgApp.processName);
          setInspectedBundleId(fgApp.bundleId);
          setLauncherWarning(null);
          setCaptureNotice(
            `Captured foreground app: ${fgApp.rawProcessName} (will watch: ${fgApp.processName})`
          );
        } else {
          setCaptureNotice(
            'Could not detect another foreground app. Switch to the target app window during the countdown or use Choose from open apps.'
          );
        }
      } catch {
        if (!cancelled) {
          setCaptureNotice('Could not read foreground app.');
        }
      } finally {
        if (!cancelled) {
          setCaptureCountdown(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [captureCountdown]);

  const handleBrowseButtonClick = async () => {
    if (window.electronAPI?.browseDesktopApp) {
      const inspected = await window.electronAPI.browseDesktopApp();
      if (inspected && !inspected.canceled && inspected.processName) {
        setDomainOrExecutable(inspected.filePath || inspected.processName);
        setInspectedProcessName(inspected.processName);
        setInspectedBundleId(inspected.bundleId);
        if (!customTagName.trim()) {
          setCustomTagName(inspected.displayName || inspected.processName);
        }
        setLauncherWarning(
          inspected.isLauncherWarning
            ? (inspected.warningMessage ??
                "This looks like a launcher. Open the app and use 'Choose from open apps' instead.")
            : null
        );
        return;
      }
      if (inspected?.canceled) {
        return;
      }
    }

    // Fallback to file input if running in browser preview
    fileInputRef.current?.click();
  };

  const handleDesktopAppFileInputPicked = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const realPath =
      window.electronAPI?.getPathForFile?.(file) || file.name;

    if (window.electronAPI?.inspectAppPath && realPath) {
      const inspected = await window.electronAPI.inspectAppPath(realPath);
      if (inspected && inspected.processName) {
        setDomainOrExecutable(inspected.filePath || realPath);
        setInspectedProcessName(inspected.processName);
        setInspectedBundleId(inspected.bundleId);
        if (!customTagName.trim()) {
          setCustomTagName(inspected.displayName || inspected.processName);
        }
        setLauncherWarning(
          inspected.isLauncherWarning
            ? (inspected.warningMessage ??
                "This looks like a launcher. Open the app and use 'Choose from open apps' instead.")
            : null
        );
        e.target.value = '';
        return;
      }
    }

    const normalized = normalizeAppTarget(realPath);
    setDomainOrExecutable(realPath);
    setInspectedProcessName(normalized.processName);
    setInspectedBundleId(undefined);
    if (!customTagName.trim()) {
      setCustomTagName(
        file.name.replace(/\.(exe|app|lnk|dmg|appimage)$/i, '')
      );
    }
    setLauncherWarning(
      isLikelyLauncherExecutable(realPath)
        ? "This looks like a launcher. Open the app and use 'Choose from open apps' instead."
        : null
    );
    e.target.value = '';
  };

  const handleToggleChooseFromOpenApps = async () => {
    if (isOpenAppsDrawerOpen) {
      setIsOpenAppsDrawerOpen(false);
      return;
    }
    setIsOpenAppsDrawerOpen(true);
    setIsLoadingOpenApps(true);
    try {
      const list = (await window.electronAPI?.listOpenApps?.()) ?? [];
      setOpenAppsList(list);
    } catch {
      setOpenAppsList([]);
    } finally {
      setIsLoadingOpenApps(false);
    }
  };

  const handleSelectOpenApp = (appItem: RunningOpenAppItem) => {
    setCustomTagName(appItem.rawProcessName || appItem.processName);
    setDomainOrExecutable(appItem.rawProcessName || appItem.processName);
    setInspectedProcessName(appItem.processName);
    setInspectedBundleId(appItem.bundleId);
    setLauncherWarning(null);
    setIsOpenAppsDrawerOpen(false);
  };

  const handleStartCaptureCurrentApp = () => {
    setCaptureNotice(null);
    setCaptureCountdown(3);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagName.trim() && !domainOrExecutable.trim()) return;

    if (targetKind === 'app') {
      const finalProcessName =
        computedWillWatchProcessName ||
        normalizeAppTarget(domainOrExecutable || customTagName).processName;
      if (!finalProcessName) return;

      const finalTagName = customTagName.trim() || finalProcessName;
      const finalDisplayDomainOrProc =
        domainOrExecutable.trim() || `${finalProcessName}.exe`;

      onAddRule(
        finalTagName,
        finalDisplayDomainOrProc,
        'app',
        finalProcessName,
        inspectedBundleId
      );
    } else {
      const finalTagName =
        customTagName.trim() || domainOrExecutable.trim();
      const fallbackDomain = `${finalTagName
        .toLowerCase()
        .replace(/\s+/g, '')}.com`;
      onAddRule(
        finalTagName,
        domainOrExecutable.trim() || fallbackDomain,
        'website'
      );
    }

    setCustomTagName('');
    setDomainOrExecutable('');
    setInspectedProcessName('');
    setInspectedBundleId(undefined);
    setLauncherWarning(null);
    setCaptureNotice(null);
  };

  const handleTestSingleAppNudge = (rule: AppRuleItem) => {
    const cleanTarget =
      rule.targetName.replace(/\s*\(.*?\)\s*/g, '').trim() || rule.targetName;
    const resolvedKind = resolveRuleKind(rule);
    triggerOverlay('overlay_intervention', {
      targetAppOrSite: cleanTarget,
      targetKind: resolvedKind,
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
            App & Website Nudge Rules
          </h2>
          <p className="mt-1 text-[13px] text-[#9490A8]">
            Choose which websites to nudge or minimize and which desktop apps to nudge or close during active focus.
          </p>
        </div>

        <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 px-3.5 py-1 text-[12px] font-semibold">
          {watchedCount} {watchedCount === 1 ? 'target' : 'targets'} watched
        </span>
      </div>

      {/* Add Target Container */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2C253E] bg-[#181424] p-4">
        {/* Desktop App Quick Picker Bar (First Suggestion on Desktop App Tab) */}
        {targetKind === 'app' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#342C4C] bg-[#120F1D] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleChooseFromOpenApps}
                className="rounded-xl bg-violet-600 !text-white px-3.5 py-1.5 text-[12px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                {isOpenAppsDrawerOpen
                  ? 'Hide open apps'
                  : 'Choose from open apps'}
              </button>

              <button
                type="button"
                onClick={handleStartCaptureCurrentApp}
                disabled={captureCountdown !== null}
                className="rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] disabled:opacity-60 transition-all duration-150 ease-out cursor-pointer"
              >
                {captureCountdown !== null
                  ? `Switch to app now… (${captureCountdown}s)`
                  : 'Add the app I am in now'}
              </button>
            </div>

            {computedWillWatchProcessName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-[#0E362D] dark:text-[#4ADE80] dark:border-[#17594A] px-3 py-1 text-[11.5px] font-semibold">
                <span>Will watch:</span>
                <strong className="font-mono">
                  {computedWillWatchProcessName}
                </strong>
              </span>
            )}
          </div>
        )}

        {/* Countdown / Capture Notice */}
        {targetKind === 'app' &&
          (captureCountdown !== null || captureNotice) && (
            <div className="rounded-xl border border-violet-300 bg-violet-50 text-violet-950 dark:border-[#52438F] dark:bg-[#261E42] dark:text-[#E2DFF0] px-3.5 py-2 text-[12px] font-medium">
              {captureCountdown !== null
                ? `Switch to the app window you want to watch now… reading foreground window in ${captureCountdown}s.`
                : captureNotice}
            </div>
          )}

        {/* Open Apps Drawer */}
        {targetKind === 'app' && isOpenAppsDrawerOpen && (
          <div className="rounded-xl border border-[#52438F] bg-[#120F1D] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#E2DFF0]">
                Currently Open Apps with Visible Windows
              </span>
              <button
                type="button"
                onClick={handleToggleChooseFromOpenApps}
                className="text-[11px] text-[#9490A8] hover:text-white cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {isLoadingOpenApps ? (
              <p className="py-3 text-center text-[12px] text-[#9490A8]">
                Scanning running desktop apps…
              </p>
            ) : openAppsList.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-[#9490A8]">
                No other open desktop apps with visible windows detected right now.
              </p>
            ) : (
              <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {openAppsList.map((appItem) => (
                  <button
                    key={`${appItem.processName}-${appItem.pid}`}
                    type="button"
                    onClick={() => handleSelectOpenApp(appItem)}
                    className="flex flex-col items-start rounded-xl border border-[#2C253E] bg-[#181424] px-3 py-2 text-left hover:border-violet-500 hover:bg-[#261E42] transition-all duration-150 ease-out cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-white truncate">
                        {appItem.rawProcessName}
                      </span>
                      <span className="shrink-0 rounded bg-violet-100 text-violet-900 dark:bg-violet-950/70 dark:text-violet-300 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                        {appItem.processName}
                      </span>
                    </div>
                    {appItem.windowTitle && (
                      <span className="mt-0.5 w-full truncate text-[11px] text-[#9490A8]">
                        {appItem.windowTitle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Segmented Control & Form */}
        <form
          onSubmit={handleCreateRule}
          className="flex flex-wrap items-center gap-2.5"
        >
          <div className="flex rounded-xl bg-[#110E1A] p-1 border border-[#2C253E]">
            <button
              type="button"
              onClick={() => {
                setTargetKind('website');
                setLauncherWarning(null);
              }}
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
                : 'Custom Tag Name (e.g., Discord, Steam)'
            }
            className="flex-1 min-w-[190px] rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
          />

          <div className="flex flex-1 min-w-[230px] items-center gap-1.5">
            <input
              type="text"
              value={domainOrExecutable}
              onChange={(e) => {
                setDomainOrExecutable(e.target.value);
                setInspectedProcessName('');
                setInspectedBundleId(undefined);
              }}
              placeholder={
                targetKind === 'website'
                  ? 'Domain URL (e.g., youtube.com)'
                  : 'App name or path (e.g., Discord.exe or C:\\...\\App.exe)'
              }
              className="w-full rounded-xl border border-[#342C4C] bg-[#0E0B16] px-3.5 py-2 text-[13px] text-white placeholder-[#9490A8] focus:border-violet-500 focus:outline-none select-text"
            />

            {targetKind === 'app' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleDesktopAppFileInputPicked}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleBrowseButtonClick}
                  title="Browse local application or shortcut"
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

        {/* Launcher Warning Banner */}
        {targetKind === 'app' && launcherWarning && (
          <div className="rounded-xl border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700/60 dark:bg-[#3A2813] dark:text-[#FBBF24] px-3.5 py-2 text-[12px] font-semibold">
            ⚠️ {launcherWarning}
          </div>
        )}

        {/* Help Tip under Desktop App Form */}
        {targetKind === 'app' && (
          <p className="text-[11.5px] text-[#9490A8]">
            Tip: the easiest way is Choose from open apps. If you paste a path, only the app&apos;s file name is used.
          </p>
        )}
      </div>

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
            const strictBadgeLabel = isApp
              ? 'Strict (Close only)'
              : 'Strict (Minimize only)';
            const watchedProcName = isApp
              ? rule.processName ||
                normalizeAppTarget(rule.domainOrProcess).processName
              : null;

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
                        { isApp && watchedProcName
                          ? `watches: ${watchedProcName}`
                          : rule.domainOrProcess}
                      </span>

                      <span className="rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40 px-2.5 py-0.5 text-[10px] font-medium">
                        {isApp ? 'Desktop App' : 'Website'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[#9490A8]">
                      Nudge prompt: &ldquo;No! Don&apos;t go on {cleanPromptName}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                      ? strictBadgeLabel
                      : 'Default (Strict off)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestSingleAppNudge(rule)}
                    className="rounded-lg border border-indigo-300 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:border-[#4E4187] dark:bg-[#261E42] dark:text-[#DDD8F3] dark:hover:bg-[#35295B] px-3 py-1 text-[11.5px] font-semibold transition-all duration-150 ease-out cursor-pointer"
                  >
                    Test &ldquo;{cleanPromptName}&rdquo;
                  </button>

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
