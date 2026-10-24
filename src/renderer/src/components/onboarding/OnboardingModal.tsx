// src/renderer/src/components/onboarding/OnboardingModal.tsx
import React, { useState, useEffect } from 'react';
import { ChibiCompanion, ChibiCompanionMode } from '../companion/ChibiCompanion';
import { NavTabId } from '../layout/Sidebar';
import { Z_LAYERS } from '../../constants/layers';

export const ONBOARDING_STORAGE_KEY = 'study_buddy_onboarding_completed_v1';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTabId) => void;
  onOpenNotepad: () => void;
}

interface OnboardingStepConfig {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  description: string;
  bullets: ReadonlyArray<string>;
  companionMode: ChibiCompanionMode;
  targetTab?: NavTabId;
  actionLabel?: string;
  opensNotepad?: boolean;
}

const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepConfig> = [
  {
    id: 'what-mambo-does',
    stepNumber: 1,
    badge: 'Step 1 of 5 · Welcome',
    title: 'Meet Mambo, your desktop study companion',
    description:
      'Mambo floats above your workspace to help you stay focused and take healthy breaks. Mambo is a gentle reminder—never a screen lock.',
    bullets: [
      'Click the Minimize button in the top bar anytime to shrink the app into the floating Mambo companion dock.',
      'Areas outside Study Buddy panels stay click-through so you can work in your other apps without interruption.',
      'Your progress, rules, and notes are saved locally on this device.',
    ],
    companionMode: 'celebrating',
  },
  {
    id: 'start-first-session',
    stepNumber: 2,
    badge: 'Step 2 of 5 · Focus Sessions',
    title: 'Start your first focus session',
    description:
      'Pick a timer preset (Quick 25/5, Standard 45/5, or Deep 60/10), type your current study goal, and press Start Focus Session.',
    bullets: [
      'Need a little more time while focusing? Use the +30s, +1m, or +5m buttons in the footer.',
      'Completed focus minutes automatically build your daily chart, streak, and companion XP in the Progress tab.',
    ],
    companionMode: 'idle_studying',
    targetTab: 'session',
    actionLabel: 'Open Session Tab',
  },
  {
    id: 'set-water-reminder',
    stepNumber: 3,
    badge: 'Step 3 of 5 · Wellness Reminders',
    title: 'Set a water or stretch reminder',
    description:
      'In the Reminders tab, customize how often Mambo checks in for Drink Water, Bathroom Break, Posture Check, or Stretch.',
    bullets: [
      'Click the pencil icon on any reminder to edit its frequency, duration, active days, and custom Mambo message.',
      'Use Preview on any card to test the break overlay immediately.',
    ],
    companionMode: 'hydration',
    targetTab: 'reminders',
    actionLabel: 'Open Reminders Tab',
  },
  {
    id: 'add-app-rule',
    stepNumber: 4,
    badge: 'Step 4 of 5 · App & Website Rules',
    title: 'Add an app or website rule',
    description:
      'While a focus session is running, Mambo watches for distracting websites (like YouTube) or desktop apps on your list and nudges you within ~1 second.',
    bullets: [
      'For websites: add a tag name (e.g., YouTube) and domain (youtube.com). Mambo can politely minimize the browser window.',
      'For desktop apps: switch to Desktop App and click "Choose from open apps" to pick any running app in one click.',
    ],
    companionMode: 'intervention',
    targetTab: 'app_rules',
    actionLabel: 'Open App Rules Tab',
  },
  {
    id: 'where-notepad-is',
    stepNumber: 5,
    badge: 'Step 5 of 5 · Built-In Notepad',
    title: 'Jot study notes in the floating Notepad',
    description:
      'Your Notepad floats alongside the dashboard or beside Mambo in Companion Mode so you can take notes without switching windows.',
    bullets: [
      'Open or close it anytime from the "Open Notepad" button in the top header—or the bottom-right pencil button on the floating Mambo dock.',
      'Highlight any word to apply Bold, Italic, Underline, or Strikethrough, attach images, or export your notes as Markdown (.md).',
    ],
    companionMode: 'idle_reading',
    opensNotepad: true,
    actionLabel: 'Show Notepad & Finish',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNotepad,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setStepIndex((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  const handleStepShortcut = () => {
    if (currentStep.targetTab) {
      onNavigateTab(currentStep.targetTab);
    }
    if (currentStep.opensNotepad) {
      onOpenNotepad();
      onClose();
    }
  };

  return (
    <div
      style={{ zIndex: Z_LAYERS.CONFIRM_MODAL }}
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none font-sans pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="flex w-[580px] max-w-full flex-col overflow-hidden rounded-[24px] border border-[#52438F] bg-[#1A1829] text-white shadow-[0_28px_85px_rgba(0,0,0,0.88)]">
        {/* Top Bar: Step Badge & Skip Option */}
        <div className="flex items-center justify-between border-b border-[#2E2A45] bg-[#13101E] px-6 py-4">
          <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-200/90 dark:bg-[#2A244D] dark:text-[#C4B5FD] dark:border-[#52438F] px-3 py-1 text-[11.5px] font-semibold">
            {currentStep.badge}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[#9490A8] hover:bg-violet-50 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:text-white transition-all duration-150 ease-out cursor-pointer"
          >
            Skip tour
          </button>
        </div>

        {/* Main Body: Live Mambo Preview + Step Guidance */}
        <div className="grid grid-cols-12 items-center gap-5 p-6">
          <div className="col-span-5 flex flex-col items-center justify-center">
            <ChibiCompanion
              mode={currentStep.companionMode}
              size="md"
              showStateBadge={false}
            />

            {/* Step Indicator Dots */}
            <div className="mt-4 flex items-center gap-1.5">
              {ONBOARDING_STEPS.map((s, idx) => {
                const active = idx === stepIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStepIndex(idx)}
                    aria-label={`Go to step ${idx + 1}: ${s.title}`}
                    className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                      active
                        ? 'w-6 bg-violet-500'
                        : 'w-2 bg-[#383052] hover:bg-[#52438F]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="col-span-7 flex flex-col gap-3">
            <h2
              id="onboarding-modal-title"
              className="font-display text-[20px] font-bold tracking-tight text-white leading-snug"
            >
              {currentStep.title}
            </h2>

            <p className="text-[13px] leading-relaxed text-[#C4B5FD]">
              {currentStep.description}
            </p>

            <ul className="mt-1 flex flex-col gap-2">
              {currentStep.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12px] leading-relaxed text-[#E2DFF0]"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {currentStep.actionLabel && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleStepShortcut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#52438F] bg-[#2A244D] px-3.5 py-1.5 text-[12px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
                >
                  <span>{currentStep.actionLabel}</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-[#2E2A45] bg-[#13101E] px-6 py-4">
          <span className="text-[11.5px] text-[#9490A8]">
            You can reopen this guide anytime in Settings.
          </span>

          <div className="flex items-center gap-2.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-xl border border-[#52438F] bg-[#141020] px-4 py-2 text-[12.5px] font-semibold text-[#C4B5FD] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-900 dark:hover:bg-violet-900/40 dark:hover:border-violet-600/60 dark:hover:text-white active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-violet-600 !text-white px-5 py-2 text-[12.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Get Started
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStepIndex((prev) =>
                    Math.min(ONBOARDING_STEPS.length - 1, prev + 1)
                  )
                }
                className="rounded-xl bg-violet-600 !text-white px-5 py-2 text-[12.5px] font-bold hover:bg-violet-700 hover:shadow-md hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
