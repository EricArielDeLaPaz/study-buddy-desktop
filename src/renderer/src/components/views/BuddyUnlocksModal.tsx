// src/renderer/src/components/views/BuddyUnlocksModal.tsx
import React from 'react';
import {
  COMPANION_PROGRESSION_DATA,
  CompanionUnlockArtwork,
  CompanionUnlockDefinition,
  CompanionAccessoryVariant,
  getDynamicProgressionData,
} from './ProgressView';

export {
  COMPANION_PROGRESSION_DATA,
  CompanionUnlockArtwork,
};
export type { CompanionUnlockDefinition, CompanionAccessoryVariant };

export interface BuddyUnlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  companions?: ReadonlyArray<CompanionUnlockDefinition>;
}

export const BuddyUnlocksModal: React.FC<BuddyUnlocksModalProps> = ({
  isOpen,
  onClose,
  companions,
}) => {
  if (!isOpen) return null;

  const roster = companions ?? getDynamicProgressionData();
  const unlockedCount = roster.filter((c) => c.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[560px] w-[520px] flex-col overflow-hidden rounded-[24px] border border-[#52438F] bg-[#181424] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]">
        {/* Modal Header with Top-Right '✕' Dismiss Icon */}
        <div className="flex items-center justify-between border-b border-[#2A233D] bg-[#13101E] px-6 py-4">
          <div>
            <h3 className="font-display text-[17px] font-bold tracking-tight text-white">
              Companion Unlock Track (Placeholders)
            </h3>
            <p className="mt-0.5 text-[12px] text-[#9E97B8]">
              Level up by completing focus sessions and wellness reminders (
              {unlockedCount} of {roster.length} unlocked)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close unlocks modal"
            title="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#261E42] border border-[#52438F] text-[#E2DFF0] hover:bg-[#A594F9] hover:text-[#141324] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Data-Driven Companion Progression List */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {roster.map((buddy) => {
            const statusText = buddy.unlocked
              ? buddy.isStartingBuddy
                ? 'Starting buddy'
                : `Unlocked at Lv ${buddy.levelRequired}`
              : `Locked · Unlocks at Lv ${buddy.levelRequired}`;

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
                      {buddy.isPlaceholder && (
                        <span className="rounded-full bg-[#261E42] border border-[#52438F] px-2 py-0.5 text-[10px] font-semibold text-[#C4B5FD]">
                          Placeholder
                        </span>
                      )}
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
                      ✓ Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1528] border border-[#2C253E] px-2.5 py-1 text-[11px] font-medium text-[#7D7696]">
                      🔒 Lv. {buddy.levelRequired}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BuddyUnlocksModal;
