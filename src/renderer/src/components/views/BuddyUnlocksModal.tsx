// src/renderer/src/components/views/BuddyUnlocksModal.tsx
import React from 'react';

export type CompanionAccessoryVariant =
  | 'base'
  | 'scholar'
  | 'glasses'
  | 'lofi'
  | 'exam'
  | 'astronaut'
  | 'sensei';

export interface CompanionUnlockDefinition {
  id: string;
  name: string;
  levelRequired: number;
  icon: CompanionAccessoryVariant;
  unlocked: boolean;
  accentBg: string;
  description: string;
  isStartingBuddy?: boolean;
}

/**
 * Extensible, data-driven array of unlockable companions.
 * Adding new objects to this array automatically renders them in the Progression Modal
 * and across the app without hardcoding UI rows.
 */
export const COMPANION_PROGRESSION_DATA: ReadonlyArray<CompanionUnlockDefinition> =
  [
    {
      id: 'buddy-lv1',
      name: 'Mambo',
      levelRequired: 1,
      icon: 'base',
      unlocked: true,
      accentBg: '#3C3173',
      description: 'Your cheerful everyday study companion.',
      isStartingBuddy: true,
    },
    {
      id: 'buddy-lv5',
      name: 'Scholar Mambo',
      levelRequired: 5,
      icon: 'scholar',
      unlocked: true,
      accentBg: '#2E4C80',
      description: 'Mortarboard cap and honors tassel for deep reading sessions.',
    },
    {
      id: 'buddy-lv7',
      name: 'Round Glasses Mambo',
      levelRequired: 7,
      icon: 'glasses',
      unlocked: true,
      accentBg: '#4C2E85',
      description: 'Signature blue-light glasses for late-night wireframing.',
    },
    {
      id: 'buddy-lv8',
      name: 'Study Night Lo-Fi',
      levelRequired: 8,
      icon: 'lofi',
      unlocked: false,
      accentBg: '#1F2437',
      description: 'Studio headphones & chill synthwave ambient animations.',
    },
    {
      id: 'buddy-lv10',
      name: 'Exam Week Mambo',
      levelRequired: 10,
      icon: 'exam',
      unlocked: false,
      accentBg: '#2A1E33',
      description: 'High-focus headband and rapid review celebration emotes.',
    },
    {
      id: 'buddy-lv12',
      name: 'Cosmic Explorer Mambo',
      levelRequired: 12,
      icon: 'astronaut',
      unlocked: false,
      accentBg: '#172554',
      description: 'Zero-gravity helmet visor for distraction-free deep work.',
    },
    {
      id: 'buddy-lv15',
      name: 'Grandmaster Mambo',
      levelRequired: 15,
      icon: 'sensei',
      unlocked: false,
      accentBg: '#3B0764',
      description: 'Golden crown & mastery aura for 100+ hours of focus.',
    },
  ];

export const CompanionUnlockArtwork: React.FC<{
  icon: CompanionAccessoryVariant;
  unlocked: boolean;
  accentBg: string;
  size?: 'sm' | 'md';
}> = ({ icon, unlocked, accentBg, size = 'md' }) => {
  const boxClasses = size === 'md' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl';
  const svgSize = size === 'md' ? 34 : 26;

  return (
    <div
      style={{ backgroundColor: accentBg }}
      className={`relative flex shrink-0 items-center justify-center border transition ${boxClasses} ${
        unlocked ? 'border-[#A594F9]/70 shadow-inner' : 'border-[#342C4C]'
      }`}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={unlocked ? 'opacity-100' : 'opacity-40 grayscale'}
      >
        {/* Head */}
        <circle
          cx="18"
          cy="19"
          r="11"
          fill="#FFE4D6"
          stroke="#241C3D"
          strokeWidth="1.8"
        />
        {/* Hair */}
        <path
          d="M7 17C7 10.5 11.8 7 18 7C24.2 7 29 10.5 29 17C26.5 14.5 23.5 14 21 15.2C19 13.5 17 13.5 15 15.2C12.5 14 9.5 14.5 7 17Z"
          fill="#3B305E"
        />
        {/* Eyes */}
        <circle cx="14" cy="19.5" r="1.4" fill="#241C3D" />
        <circle cx="22" cy="19.5" r="1.4" fill="#241C3D" />

        {icon === 'scholar' && (
          <g>
            <polygon points="18,3 6,8 18,12 30,8" fill="#1E1B4B" />
            <line
              x1="27"
              y1="9"
              x2="28"
              y2="15"
              stroke="#FBBF24"
              strokeWidth="1.6"
            />
          </g>
        )}

        {icon === 'glasses' && (
          <g>
            <circle
              cx="14"
              cy="19.5"
              r="3.4"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
            <circle
              cx="22"
              cy="19.5"
              r="3.4"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
            <line
              x1="17.4"
              y1="19.5"
              x2="18.6"
              y2="19.5"
              stroke="#A594F9"
              strokeWidth="1.5"
            />
          </g>
        )}

        {icon === 'lofi' && (
          <g>
            <path
              d="M6.5 19C6.5 11.5 11.5 6.5 18 6.5C24.5 6.5 29.5 11.5 29.5 19"
              stroke="#60A5FA"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <rect
              x="4.5"
              y="16"
              width="3.5"
              height="7"
              rx="1.7"
              fill="#60A5FA"
            />
            <rect
              x="28"
              y="16"
              width="3.5"
              height="7"
              rx="1.7"
              fill="#60A5FA"
            />
          </g>
        )}

        {icon === 'exam' && (
          <g>
            <rect
              x="7.5"
              y="12.5"
              width="21"
              height="3"
              rx="1.5"
              fill="#F43F5E"
            />
            <circle cx="18" cy="14" r="1.5" fill="#FFFFFF" />
          </g>
        )}

        {icon === 'astronaut' && (
          <circle
            cx="18"
            cy="19"
            r="13"
            stroke="#93C5FD"
            strokeWidth="1.8"
            fill="rgba(147, 197, 253, 0.14)"
          />
        )}

        {icon === 'sensei' && (
          <polygon
            points="11,8 14,3 18,7 22,3 25,8"
            fill="#FBBF24"
            stroke="#78350F"
            strokeWidth="1"
          />
        )}

        {/* Smile */}
        <path
          d="M15.5 23.5C16.5 24.8 19.5 24.8 20.5 23.5"
          stroke="#241C3D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      {/* Lock Badge Overlay when Locked */}
      {!unlocked && (
        <span
          title="Locked companion"
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#342C4C] bg-[#120F1D] text-[10px] shadow"
        >
          🔒
        </span>
      )}
    </div>
  );
};

export interface BuddyUnlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  companions?: ReadonlyArray<CompanionUnlockDefinition>;
}

export const BuddyUnlocksModal: React.FC<BuddyUnlocksModalProps> = ({
  isOpen,
  onClose,
  companions = COMPANION_PROGRESSION_DATA,
}) => {
  if (!isOpen) return null;

  const unlockedCount = companions.filter((c) => c.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[560px] w-[520px] flex-col overflow-hidden rounded-[24px] border border-[#4E4187] bg-[#181424] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2A233D] bg-[#13101E] px-6 py-4">
          <div>
            <h3 className="text-[17px] font-bold tracking-tight text-white">
              Unlockable Companions Roster
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Level up by completing focus sessions and wellness reminders ({unlockedCount} of {companions.length} unlocked)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close unlocks modal"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F1A30] text-[#B8B2CC] hover:bg-[#32294D] hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Data-Driven Companion Progression List */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {companions.map((buddy) => {
            const statusText = buddy.unlocked
              ? buddy.isStartingBuddy
                ? 'Unlocked · Starting buddy'
                : `Unlocked · Level ${buddy.levelRequired}`
              : `Locked · Unlocks at Level ${buddy.levelRequired}`;

            return (
              <div
                key={buddy.id}
                className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                  buddy.unlocked
                    ? 'border-[#3B3256] bg-[#1F1930]'
                    : 'border-[#251F36] bg-[#120F1C]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanionUnlockArtwork
                    icon={buddy.icon}
                    unlocked={buddy.unlocked}
                    accentBg={buddy.accentBg}
                    size="md"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14.5px] font-bold text-white truncate">
                        {buddy.name}
                      </p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                          buddy.unlocked
                            ? 'bg-[#3C3173] text-[#E2DFF0]'
                            : 'bg-[#1D182B] text-[#7D7696]'
                        }`}
                      >
                        Lv. {buddy.levelRequired}
                      </span>
                    </div>

                    <p
                      className={`mt-0.5 text-[11.5px] font-semibold ${
                        buddy.unlocked ? 'text-[#4ADE80]' : 'text-[#9E97B8]'
                      }`}
                    >
                      {statusText}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#7D7696] truncate">
                      {buddy.description}
                    </p>
                  </div>
                </div>

                <div className="ml-3 shrink-0">
                  {buddy.unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0E362D] border border-[#17594A] px-2.5 py-1 text-[11px] font-semibold text-[#4ADE80]">
                      ✓ Earned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1528] border border-[#2C253E] px-2.5 py-1 text-[11px] font-medium text-[#7D7696]">
                      🔒 Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2A233D] bg-[#13101E] px-6 py-3.5">
          <span className="text-[11.5px] text-[#8E87A8]">
            Current Progress: <strong className="text-white">Level 7 (2,450 / 3,000 XP)</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#A594F9] px-4 py-2 text-[12.5px] font-bold text-[#171329] hover:bg-[#B5A7FA] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuddyUnlocksModal;