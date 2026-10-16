// src/renderer/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  AppProvider,
  useApp,
  TriggerOverlayOptions,
} from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { SessionView } from './components/views/SessionView';
import { RemindersView } from './components/views/RemindersView';
import { ScheduleView } from './components/views/ScheduleView';
import {
  AppRulesView,
  AppRuleItem,
} from './components/views/AppRulesView';
import { ProgressView } from './components/views/ProgressView';
import { BuddyStudioView } from './components/views/BuddyStudioView';
import { MarketplaceView } from './components/views/MarketplaceView';
import { SettingsView } from './components/views/SettingsView';
import { CenterOverlay } from './components/overlays/CenterOverlay';
import { Scratchpad } from './components/scratchpad/Scratchpad';
import { FloatingMascotDock } from './components/companion/FloatingMascotDock';
import { OverlayKind } from './types/buddy';
import type {
  OverlayTriggerType,
  OverlayTriggerPayload,
} from '../../preload/index.d';

const TAB_LABELS: Record<NavTabId, string> = {
  session: 'Session',
  reminders: 'Reminders',
  schedule: 'Schedule',
  app_rules: 'App rules',
  progress: 'Progress',
  buddy: 'Buddy',
  marketplace: 'Marketplace',
  settings: 'Settings',
};

const INITIAL_APP_RULES: AppRuleItem[] = [
  {
    id: 'rule-discord',
    kind: 'app',
    targetName: 'Discord',
    domainOrProcess: 'Discord.exe',
    category: 'Chat',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-youtube',
    kind: 'website',
    targetName: 'YouTube',
    domainOrProcess: 'youtube.com',
    category: 'Video',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-reddit',
    kind: 'website',
    targetName: 'Reddit',
    domainOrProcess: 'reddit.com',
    category: 'Social',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-twitter',
    kind: 'website',
    targetName: 'Twitter',
    domainOrProcess: 'x.com / twitter.com',
    category: 'Social',
    strictBlock: true,
    enabled: true,
  },
  {
    id: 'rule-twitch',
    kind: 'website',
    targetName: 'Twitch',
    domainOrProcess: 'twitch.tv',
    category: 'Video',
    strictBlock: false,
    enabled: true,
  },
];

const StudyBuddyViewport: React.FC = () => {
  const {
    activeOverlay,
    triggerOverlay,
    dismissActiveOverlay,
    isScratchpadOpen,
    setScratchpadOpen,
    setInteractiveRegionHovered,
    syncWindowClickThrough,
  } = useApp();

  const [activeTab, setActiveTab] = useState<NavTabId>('session');
  // Strict mutual exclusivity: true = Full Desktop App Window, false = Floating Mambo Companion Dock
  const [isDashboardVisible, setIsDashboardVisible] = useState<boolean>(true);
  const [isDevBarCollapsed, setIsDevBarCollapsed] = useState<boolean>(false);
  const [appRules, setAppRules] = useState<AppRuleItem[]>(INITIAL_APP_RULES);

  const handleInteractiveRegionHover = useCallback(
    (regionId: string, isHovered: boolean) => {
      setInteractiveRegionHovered(regionId, isHovered);
      syncWindowClickThrough();
    },
    [setInteractiveRegionHovered, syncWindowClickThrough]
  );

  const activateOverlayImmediately = useCallback(
    (kind: OverlayKind, options?: TriggerOverlayOptions) => {
      if (activeOverlay !== null) {
        dismissActiveOverlay('manual_dismiss');
        window.setTimeout(() => {
          triggerOverlay(kind, options);
        }, 0);
      } else {
        triggerOverlay(kind, options);
      }
    },
    [activeOverlay, dismissActiveOverlay, triggerOverlay]
  );

  useEffect(() => {
    if (isDashboardVisible) {
      setInteractiveRegionHovered('floating-mascot-dock-shell', false);
      setInteractiveRegionHovered('floating-mascot-dock', false);
    } else {
      setInteractiveRegionHovered('main-dashboard-shell', false);
    }
    syncWindowClickThrough();
  }, [isDashboardVisible, setInteractiveRegionHovered, syncWindowClickThrough]);

  useEffect(() => {
    syncWindowClickThrough();

    if (!window.electronAPI?.onTriggerOverlay) {
      return;
    }

    const unsubscribe = window.electronAPI.onTriggerOverlay(
      (type: OverlayTriggerType, payload?: OverlayTriggerPayload) => {
        if (type === 'hydration') {
          activateOverlayImmediately('overlay_hydration', {
            durationSeconds: payload?.durationSeconds ?? 300,
            message: payload?.message,
          });
        } else if (type === 'bathroom') {
          activateOverlayImmediately('overlay_bathroom', {
            durationSeconds: payload?.durationSeconds ?? 600,
            message: payload?.message,
          });
        } else if (type === 'intervention') {
          activateOverlayImmediately('overlay_intervention', {
            targetAppOrSite: payload?.targetAppOrSite ?? 'YouTube',
            strictMode: payload?.strictMode ?? false,
            message: payload?.message,
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [syncWindowClickThrough, activateOverlayImmediately]);

  const handleToggleRuleEnabled = (id: string) => {
    setAppRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleToggleRuleStrict = (id: string) => {
    setAppRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, strictBlock: !r.strictBlock } : r
      )
    );
  };

  const handleAddRule = (
    targetName: string,
    domainOrProcess: string,
    kind: 'website' | 'app' = 'website'
  ) => {
    setAppRules((prev) => [
      {
        id: `rule-${Date.now()}`,
        kind,
        targetName,
        domainOrProcess,
        category: kind === 'app' ? 'Gaming' : 'Social',
        strictBlock: false,
        enabled: true,
      },
      ...prev,
    ]);
  };

  return (
    <div className="w-screen h-screen fixed inset-0 overflow-hidden pointer-events-none select-none font-sans">
      {/* 1. EXCLUSIVE MODE A: Full Multi-Tab Study Buddy Desktop Window */}
      {isDashboardVisible && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-6 pointer-events-none">
          <div
            onMouseEnter={() =>
              handleInteractiveRegionHover('main-dashboard-shell', true)
            }
            onMouseLeave={() =>
              handleInteractiveRegionHover('main-dashboard-shell', false)
            }
            className="pointer-events-auto flex h-[690px] w-[1060px] max-w-full max-h-full flex-col overflow-hidden rounded-[24px] border border-[#322A4B] bg-[#141020] shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
          >
            {/* Global Window Header with "Open Notepad" / "Close Notepad" */}
            <Header
              isScratchpadOpen={isScratchpadOpen}
              onToggleScratchpad={() => setScratchpadOpen(!isScratchpadOpen)}
              onMinimizeToCompanion={() => setIsDashboardVisible(false)}
              activeTabLabel={TAB_LABELS[activeTab]}
            />

            {/* Clean Sidebar + Active View Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

              <main className="flex-1 overflow-y-auto bg-[#141020]">
                {activeTab === 'session' && <SessionView />}
                {activeTab === 'reminders' && <RemindersView />}
                {activeTab === 'schedule' && <ScheduleView />}
                {activeTab === 'app_rules' && (
                  <AppRulesView
                    rules={appRules}
                    onToggleRuleEnabled={handleToggleRuleEnabled}
                    onToggleRuleStrict={handleToggleRuleStrict}
                    onAddRule={handleAddRule}
                  />
                )}
                {activeTab === 'progress' && <ProgressView />}
                {activeTab === 'buddy' && <BuddyStudioView />}
                {activeTab === 'marketplace' && <MarketplaceView />}
                {activeTab === 'settings' && <SettingsView />}
              </main>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXCLUSIVE MODE B: Compact Floating Mambo Companion Dock */}
      {!isDashboardVisible && activeOverlay === null && (
        <div
          className="pointer-events-auto"
          onMouseEnter={() =>
            handleInteractiveRegionHover('floating-mascot-dock-shell', true)
          }
          onMouseLeave={() =>
            handleInteractiveRegionHover('floating-mascot-dock-shell', false)
          }
        >
          <FloatingMascotDock
            isDashboardVisible={isDashboardVisible}
            onExpandToFullWindow={() => setIsDashboardVisible(true)}
          />
        </div>
      )}

      {/* 3. Floating Resizable & Drag-and-Drop Notepad */}
      <div
        className="pointer-events-auto"
        onMouseEnter={() =>
          handleInteractiveRegionHover('scratchpad-shell', true)
        }
        onMouseLeave={() =>
          handleInteractiveRegionHover('scratchpad-shell', false)
        }
      >
        <Scratchpad />
      </div>

      {/* 4. Conditional Fullscreen Dimmed Backdrop & Center Overlay Modal */}
      {activeOverlay !== null && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="pointer-events-auto [&>div]:!bg-transparent [&>div]:pointer-events-none [&>div>div]:pointer-events-auto"
            onMouseEnter={() =>
              handleInteractiveRegionHover('center-overlay-card', true)
            }
            onMouseLeave={() =>
              handleInteractiveRegionHover('center-overlay-card', false)
            }
          >
            <CenterOverlay />
          </div>
        </div>
      )}

      {/* 5. Floating Collapsible Dev Trigger Bar */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
        <div
          onMouseEnter={() =>
            handleInteractiveRegionHover('dev-trigger-bar', true)
          }
          onMouseLeave={() =>
            handleInteractiveRegionHover('dev-trigger-bar', false)
          }
          className="bg-zinc-900/90 border border-zinc-700 text-white rounded-full px-4 py-2 text-xs flex items-center gap-2 shadow-2xl pointer-events-auto backdrop-blur-md transition-all duration-200"
        >
          <button
            type="button"
            onClick={() => setIsDevBarCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-violet-300 hover:text-violet-200 transition cursor-pointer pr-1"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dev Controls</span>
            <span className="text-[10px] text-zinc-400">
              {isDevBarCollapsed ? '▸' : '◂'}
            </span>
          </button>

          {!isDevBarCollapsed && (
            <>
              <span className="h-3.5 w-[1px] bg-zinc-700" />

              <button
                type="button"
                onClick={() => setIsDashboardVisible((prev) => !prev)}
                className="rounded-full bg-indigo-600/80 hover:bg-indigo-500 px-3 py-1 font-semibold text-white transition cursor-pointer"
              >
                {isDashboardVisible
                  ? 'Minimize to Companion Mode'
                  : 'Expand Full Window (⤢)'}
              </button>

              <button
                type="button"
                onClick={() => setScratchpadOpen(!isScratchpadOpen)}
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-violet-200 transition cursor-pointer"
              >
                {isScratchpadOpen ? 'Close Notepad' : 'Open Notepad'}
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_hydration', {
                    durationSeconds: 300,
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-zinc-100 transition cursor-pointer"
              >
                Hydration (5:00)
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_bathroom', {
                    durationSeconds: 600,
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-zinc-100 transition cursor-pointer"
              >
                Bathroom (10:00)
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'YouTube',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: YouTube
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'Reddit',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: Reddit
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'Discord',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: Discord
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInteractiveRegionHover('center-overlay-card', false);
                  dismissActiveOverlay('manual_dismiss');
                }}
                disabled={activeOverlay === null}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  activeOverlay !== null
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 cursor-pointer'
                    : 'bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <StudyBuddyViewport />
    </AppProvider>
  );
};

export default App;