// src/renderer/src/components/companion/ChibiCompanion.tsx
import React, { useState, useEffect } from 'react';
import { AnimationSlotId } from '../../types/buddy';

export type CompanionCharacterId =
  | 'mambo'
  | 'cozy_library'
  | 'neon_night'
  | 'lavender_focus'
  | 'retro_arcade';

export type ChibiCompanionMode =
  | 'idle_studying'
  | 'idle_reading'
  | 'hydration'
  | 'bathroom'
  | 'intervention'
  | 'sleeping'
  | 'celebrating';

export type ChibiCompanionSize = 'sm' | 'md' | 'lg';

export interface CustomSlotUpload {
  fileName: string;
  dataUrl: string;
}

export interface RuntimeSlotLookup {
  id: string;
  label: string;
  slotKey: string;
  mode: ChibiCompanionMode;
  reminderTrigger?: string;
  uploadedAnimation?: CustomSlotUpload;
}

export interface StoredActiveCompanion {
  id: string;
  name: string;
  characterId?: CompanionCharacterId;
  kind: 'progression' | 'Marketplace' | 'Custom';
  slots: RuntimeSlotLookup[];
}

export const ACTIVE_COMPANION_STORAGE_KEY = 'study_buddy_active_companion_v1';

export interface ChibiCompanionProps {
  mode: ChibiCompanionMode;
  characterId?: CompanionCharacterId;
  size?: ChibiCompanionSize;
  className?: string;
  showStateBadge?: boolean;
  /**
   * Optional explicit custom upload override (used when previewing a specific slot in Buddy Studio).
   * When omitted, ChibiCompanion automatically checks the equipped buddy in localStorage.
   */
  customUploadOverride?: CustomSlotUpload | null;
  /**
   * Optional reminder name or slot ID that triggered the current overlay.
   */
  reminderTriggerName?: string;
  /**
   * If true, disables reading from global equipped buddy storage (used for static catalog cards).
   */
  disableGlobalEquipLookup?: boolean;
}

/**
 * Maps an AnimationSlotId from types/buddy.ts to ChibiCompanionMode.
 */
export function animationSlotIdToMode(
  slot: AnimationSlotId
): ChibiCompanionMode {
  switch (slot) {
    case 'idle_studying':
      return 'idle_studying';
    case 'idle_reading':
      return 'idle_reading';
    case 'reminder_drinking_water':
      return 'hydration';
    case 'reminder_bathroom':
      return 'bathroom';
    case 'status_nudge':
      return 'intervention';
    case 'status_sleeping':
      return 'sleeping';
  }
}

/**
 * Stage P4: Single canonical mapping from app state / mode to slotKey.
 * - idle_studying & idle_reading -> 'Idle'
 * - hydration (drinking water)   -> 'Hydration'
 * - bathroom (stretch / break)   -> 'Break'
 * - intervention (nudge)         -> 'Alert'
 * - celebrating                  -> 'Success'
 * - sleeping                     -> 'Sleeping'
 */
export function modeToCanonicalSlotKey(mode: ChibiCompanionMode): string {
  switch (mode) {
    case 'idle_studying':
    case 'idle_reading':
      return 'Idle';
    case 'hydration':
      return 'Hydration';
    case 'bathroom':
      return 'Break';
    case 'intervention':
      return 'Alert';
    case 'celebrating':
      return 'Success';
    case 'sleeping':
      return 'Sleeping';
  }
}

export function inferCharacterIdFromAnyId(
  rawId?: string
): CompanionCharacterId {
  if (!rawId) return 'mambo';
  const lower = rawId.toLowerCase();
  if (lower.includes('cozy')) return 'cozy_library';
  if (lower.includes('neon')) return 'neon_night';
  if (lower.includes('lavender') || lower.includes('forest')) {
    return 'lavender_focus';
  }
  if (lower.includes('retro') || lower.includes('arcade')) {
    return 'retro_arcade';
  }
  return 'mambo';
}

function readEquippedCompanionFromStorage(): StoredActiveCompanion | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredActiveCompanion;
  } catch {
    return null;
  }
}

const SIZE_CLASSES: Record<
  ChibiCompanionSize,
  { container: string; svg: string; badgeText: string }
> = {
  sm: {
    container: 'w-20 h-20 rounded-2xl',
    svg: 'w-16 h-16',
    badgeText: 'text-[9px]',
  },
  md: {
    container: 'w-36 h-36 rounded-2xl',
    svg: 'w-28 h-28',
    badgeText: 'text-[10.5px]',
  },
  lg: {
    container: 'w-[220px] h-[220px] rounded-2xl',
    svg: 'w-40 h-40',
    badgeText: 'text-[11.5px]',
  },
};

const MODE_META: Record<
  ChibiCompanionMode,
  {
    label: string;
    glowColor: string;
    ringColor: string;
    bodyAnimation: string;
  }
> = {
  idle_studying: {
    label: 'Studying · Focused',
    glowColor: 'rgba(165, 148, 249, 0.18)',
    ringColor: 'border-[#3E355B]',
    bodyAnimation: 'mambo-float 3.4s ease-in-out infinite',
  },
  idle_reading: {
    label: 'Reading · Deep Focus',
    glowColor: 'rgba(196, 181, 253, 0.2)',
    ringColor: 'border-[#4C3F78]',
    bodyAnimation: 'mambo-float 3.8s ease-in-out infinite',
  },
  hydration: {
    label: 'Reminder · Drinking water',
    glowColor: 'rgba(147, 197, 253, 0.22)',
    ringColor: 'border-[#4E4187]',
    bodyAnimation: 'mambo-sip 2.4s ease-in-out infinite',
  },
  bathroom: {
    label: 'Reminder · Stretch & Break',
    glowColor: 'rgba(196, 181, 253, 0.22)',
    ringColor: 'border-[#4C3F78]',
    bodyAnimation: 'mambo-wave 2.2s ease-in-out infinite',
  },
  intervention: {
    label: 'Status · Nudge Alert',
    glowColor: 'rgba(248, 113, 113, 0.24)',
    ringColor: 'border-[#7F2D3C]',
    bodyAnimation: 'mambo-nudge 1.2s ease-in-out infinite',
  },
  sleeping: {
    label: 'Status · Sleeping',
    glowColor: 'rgba(129, 140, 248, 0.16)',
    ringColor: 'border-[#342C4C]',
    bodyAnimation: 'mambo-float 4.6s ease-in-out infinite',
  },
  celebrating: {
    label: 'Great Job · Celebrating!',
    glowColor: 'rgba(74, 222, 128, 0.22)',
    ringColor: 'border-[#2E6B56]',
    bodyAnimation: 'mambo-bounce 1.1s ease-in-out infinite',
  },
};

export const ChibiCompanion: React.FC<ChibiCompanionProps> = ({
  mode,
  characterId: propCharacterId,
  size = 'lg',
  className = '',
  showStateBadge = size === 'lg',
  customUploadOverride,
  reminderTriggerName,
  disableGlobalEquipLookup = false,
}) => {
  const [equipped, setEquipped] = useState<StoredActiveCompanion | null>(() =>
    disableGlobalEquipLookup ? null : readEquippedCompanionFromStorage()
  );
  const [mediaLoadFailed, setMediaLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    if (disableGlobalEquipLookup) return;
    const handleSync = () => {
      setEquipped(readEquippedCompanionFromStorage());
      setMediaLoadFailed(false);
    };
    window.addEventListener('study-buddy:companion-updated', handleSync);
    return () => {
      window.removeEventListener('study-buddy:companion-updated', handleSync);
    };
  }, [disableGlobalEquipLookup]);

  const resolvedCharacterId: CompanionCharacterId =
    propCharacterId ??
    equipped?.characterId ??
    inferCharacterIdFromAnyId(equipped?.id);

  // Stage P4: Resolve custom uploaded animation for the current state (if any)
  const resolvedCustomUpload: CustomSlotUpload | undefined =
    React.useMemo(() => {
      if (customUploadOverride !== undefined) {
        return customUploadOverride ?? undefined;
      }
      if (disableGlobalEquipLookup || !equipped?.slots?.length) {
        return undefined;
      }

      const targetKey = modeToCanonicalSlotKey(mode).toLowerCase();

      // 1. Honor reminderTrigger or bound slot match first if provided
      if (reminderTriggerName) {
        const triggerLower = reminderTriggerName.toLowerCase();
        const byReminder = equipped.slots.find(
          (s) =>
            Boolean(s.uploadedAnimation?.dataUrl) &&
            (s.id.toLowerCase() === triggerLower ||
              s.label.toLowerCase() === triggerLower ||
              s.reminderTrigger?.toLowerCase() === triggerLower)
        );
        if (byReminder?.uploadedAnimation?.dataUrl) {
          return byReminder.uploadedAnimation;
        }
      }

      // 2. Match by canonical slotKey (Idle, Hydration, Break, Alert, Success, Sleeping) or mode
      const bySlotKey = equipped.slots.find(
        (s) =>
          Boolean(s.uploadedAnimation?.dataUrl) &&
          (s.slotKey.toLowerCase() === targetKey || s.mode === mode)
      );
      return bySlotKey?.uploadedAnimation;
    }, [
      customUploadOverride,
      disableGlobalEquipLookup,
      equipped,
      mode,
      reminderTriggerName,
    ]);

  useEffect(() => {
    setMediaLoadFailed(false);
  }, [resolvedCustomUpload?.dataUrl, mode, resolvedCharacterId]);

  const sizeConfig = SIZE_CLASSES[size];
  const meta = MODE_META[mode];

  const shouldRenderCustomMedia =
    Boolean(resolvedCustomUpload?.dataUrl) && !mediaLoadFailed;
  const isVideoUpload =
    Boolean(resolvedCustomUpload?.fileName?.toLowerCase().endsWith('.webm')) ||
    Boolean(resolvedCustomUpload?.dataUrl?.startsWith('data:video/'));

  return (
    <div
      data-companion-mode={mode}
      data-companion-character={resolvedCharacterId}
      className={`relative mx-auto flex flex-col items-center justify-center bg-[#0D0B14] border ${meta.ringColor} select-none overflow-hidden transition-all duration-300 ${sizeConfig.container} ${className}`}
    >
      {/* Scoped Keyframes + Reduced Motion Accessibility Rule */}
      <style>{`
        @keyframes mambo-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mambo-sip {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-2deg); }
        }
        @keyframes mambo-wave {
          0%, 100% { transform: translateY(0px) rotate(-2.5deg); }
          50% { transform: translateY(-5px) rotate(2.5deg); }
        }
        @keyframes mambo-nudge {
          0%, 100% { transform: translateX(0px) scale(1); }
          25% { transform: translateX(-3px) scale(1.02); }
          75% { transform: translateX(3px) scale(1.02); }
        }
        @keyframes mambo-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-9px) scale(1.04); }
        }
        @keyframes mambo-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes mambo-eye-scan {
          0%, 100% { transform: translateX(-2px); }
          50% { transform: translateX(2.5px); }
        }
        @keyframes mambo-droplet-rise {
          0% { opacity: 0; transform: translateY(6px) scale(0.75); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-16px) scale(1.1); }
        }
        @keyframes mambo-sparkle-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.75) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.15) rotate(20deg); }
        }
        @keyframes mambo-pulse-ring {
          0% { opacity: 0.65; transform: scale(0.88); }
          100% { opacity: 0; transform: scale(1.32); }
        }
        @media (prefers-reduced-motion: reduce) {
          .companion-animated-node,
          .companion-animated-node * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Ambient Radial Backdrop Glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${meta.glowColor} 0%, transparent 72%)`,
        }}
      />

      {/* Intervention Caution Pulse Ring */}
      {mode === 'intervention' && (
        <div
          className="companion-animated-node pointer-events-none absolute h-3/4 w-3/4 rounded-full border-2 border-rose-500/45"
          style={{ animation: 'mambo-pulse-ring 1.6s ease-out infinite' }}
        />
      )}

      {/* Stage P4: Custom Uploaded Animation OR Built-In Original Vector Character */}
      {shouldRenderCustomMedia && resolvedCustomUpload ? (
        <div className="relative z-10 flex items-center justify-center p-2">
          {isVideoUpload ? (
            <video
              src={resolvedCustomUpload.dataUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setMediaLoadFailed(true)}
              className={`${sizeConfig.svg} object-contain rounded-xl`}
            />
          ) : (
            <img
              src={resolvedCustomUpload.dataUrl}
              alt={resolvedCustomUpload.fileName || 'Custom companion animation'}
              onError={() => setMediaLoadFailed(true)}
              className={`${sizeConfig.svg} object-contain rounded-xl`}
            />
          )}
        </div>
      ) : (
        <div
          className="companion-animated-node relative z-10 flex items-center justify-center"
          style={{ animation: meta.bodyAnimation }}
        >
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={sizeConfig.svg}
          >
            {/* Ground Shadow */}
            <ellipse
              cx="100"
              cy="176"
              rx="44"
              ry="7"
              fill="#07050B"
              opacity="0.65"
            />

            {/* Shared Mode Particles (Hydration Droplets, Sleep Zzz, Celebration Sparkles, Alert Badge) */}
            {mode === 'hydration' && (
              <g>
                <path
                  d="M42 64C42 64 48 72 48 76C48 79.3 45.3 82 42 82C38.7 82 36 79.3 36 76C36 72 42 64 42 64Z"
                  fill="#60A5FA"
                  style={{
                    animation: 'mambo-droplet-rise 2.1s ease-in-out infinite',
                  }}
                />
                <path
                  d="M158 52C158 52 163 59 163 62.5C163 65.2 160.8 67.5 158 67.5C155.2 67.5 153 65.2 153 62.5C153 59 158 52 158 52Z"
                  fill="#93C5FD"
                  style={{
                    animation:
                      'mambo-droplet-rise 2.4s ease-in-out 0.6s infinite',
                  }}
                />
              </g>
            )}

            {mode === 'sleeping' && (
              <g>
                <text
                  x="142"
                  y="56"
                  fill="#C4B5FD"
                  fontSize="16"
                  fontWeight="bold"
                  style={{
                    animation: 'mambo-droplet-rise 2.8s ease-in-out infinite',
                  }}
                >
                  Z
                </text>
                <text
                  x="156"
                  y="42"
                  fill="#A594F9"
                  fontSize="12"
                  fontWeight="bold"
                  style={{
                    animation:
                      'mambo-droplet-rise 2.8s ease-in-out 0.9s infinite',
                  }}
                >
                  z
                </text>
              </g>
            )}

            {mode === 'celebrating' && (
              <g>
                <path
                  d="M40 50L43 58L51 61L43 64L40 72L37 64L29 61L37 58L40 50Z"
                  fill="#FDE047"
                  style={{
                    transformOrigin: '40px 61px',
                    animation:
                      'mambo-sparkle-twinkle 1.4s ease-in-out infinite',
                  }}
                />
                <path
                  d="M160 46L162.5 52.5L169 55L162.5 57.5L160 64L157.5 57.5L151 55L157.5 52.5L160 46Z"
                  fill="#A594F9"
                  style={{
                    transformOrigin: '160px 55px',
                    animation:
                      'mambo-sparkle-twinkle 1.4s ease-in-out 0.5s infinite',
                  }}
                />
                <circle cx="152" cy="88" r="3" fill="#4ADE80" />
                <circle cx="46" cy="92" r="2.5" fill="#F472B6" />
              </g>
            )}

            {mode === 'intervention' && (
              <g>
                <circle cx="158" cy="54" r="13" fill="#EF4444" />
                <rect
                  x="156"
                  y="45"
                  width="4"
                  height="10"
                  rx="2"
                  fill="#FFFFFF"
                />
                <circle cx="158" cy="60" r="2.2" fill="#FFFFFF" />
              </g>
            )}

            {/* CHARACTER 1: MAMBO (Default Starting Companion — Unchanged Aesthetic) */}
            {resolvedCharacterId === 'mambo' && (
              <g>
                <path
                  d="M62 132C62 119 78 112 100 112C122 112 138 119 138 132L144 166C144 170 140 173 135 173H65C60 173 56 170 56 166L62 132Z"
                  fill="#5B4B9A"
                  stroke="#2B224C"
                  strokeWidth="3"
                />
                <path
                  d="M82 115L100 129L118 115"
                  stroke="#DDD6FE"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polygon
                  points="100,127 94,142 100,147 106,142"
                  fill="#F472B6"
                />

                {mode === 'bathroom' || mode === 'celebrating' ? (
                  <>
                    <path
                      d="M64 128C48 118 42 102 46 92"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="46" cy="90" r="7" fill="#FFE4D6" />
                    <path
                      d="M136 128C152 118 158 102 154 92"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="154" cy="90" r="7" fill="#FFE4D6" />
                  </>
                ) : mode === 'hydration' ? (
                  <>
                    <path
                      d="M62 130C52 138 50 150 54 158"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="55" cy="159" r="6.5" fill="#FFE4D6" />
                    <path
                      d="M136 130C146 126 142 114 126 112"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                  </>
                ) : mode === 'intervention' ? (
                  <>
                    <path
                      d="M62 132C52 126 52 114 60 108"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="106" r="7" fill="#FFE4D6" />
                    <path
                      d="M138 132C148 126 148 114 140 108"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <circle cx="140" cy="106" r="7" fill="#FFE4D6" />
                  </>
                ) : (
                  <>
                    <path
                      d="M63 130C55 140 58 154 70 158"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M137 130C145 140 142 154 130 158"
                      stroke="#5B4B9A"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                  </>
                )}

                <circle
                  cx="54"
                  cy="78"
                  r="10"
                  fill="#3B305E"
                  stroke="#241C3D"
                  strokeWidth="3"
                />
                <circle
                  cx="146"
                  cy="78"
                  r="10"
                  fill="#3B305E"
                  stroke="#241C3D"
                  strokeWidth="3"
                />

                <rect
                  x="54"
                  y="42"
                  width="92"
                  height="80"
                  rx="40"
                  fill="#FFE4D6"
                  stroke="#2B224C"
                  strokeWidth="3.2"
                />

                <path
                  d="M54 74C54 51 74 38 100 38C126 38 146 51 146 74C138 64 127 59 115 64C108 56 93 56 85 64C73 59 62 64 54 74Z"
                  fill="#3B305E"
                  stroke="#241C3D"
                  strokeWidth="3"
                />
                <path
                  d="M100 38C98 27 107 22 114 26"
                  stroke="#3B305E"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />

                <ellipse
                  cx="69"
                  cy="95"
                  rx="6.5"
                  ry="3.8"
                  fill="#FB7185"
                  opacity="0.55"
                />
                <ellipse
                  cx="131"
                  cy="95"
                  rx="6.5"
                  ry="3.8"
                  fill="#FB7185"
                  opacity="0.55"
                />

                <g
                  style={
                    mode === 'idle_studying'
                      ? {
                          transformOrigin: '100px 84px',
                          animation: 'mambo-blink 4.2s infinite',
                        }
                      : mode === 'idle_reading'
                      ? {
                          animation: 'mambo-eye-scan 2.2s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {mode === 'sleeping' ? (
                    <>
                      <path
                        d="M73 85C76 89 84 89 87 85"
                        stroke="#241C3D"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M113 85C116 89 124 89 127 85"
                        stroke="#241C3D"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : mode === 'celebrating' || mode === 'bathroom' ? (
                    <>
                      <path
                        d="M73 84C76 78 84 78 87 84"
                        stroke="#241C3D"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M113 84C116 78 124 78 127 84"
                        stroke="#241C3D"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                      />
                    </>
                  ) : mode === 'intervention' ? (
                    <>
                      <circle cx="80" cy="84" r="6.5" fill="#241C3D" />
                      <circle cx="78" cy="82" r="2.2" fill="#FFFFFF" />
                      <circle cx="120" cy="84" r="6.5" fill="#241C3D" />
                      <circle cx="118" cy="82" r="2.2" fill="#FFFFFF" />
                      <path
                        d="M71 72L87 76"
                        stroke="#241C3D"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M129 72L113 76"
                        stroke="#241C3D"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <circle cx="80" cy="84" r="5.8" fill="#241C3D" />
                      <circle cx="78.2" cy="82" r="2" fill="#FFFFFF" />
                      <circle cx="120" cy="84" r="5.8" fill="#241C3D" />
                      <circle cx="118.2" cy="82" r="2" fill="#FFFFFF" />
                    </>
                  )}
                </g>

                <g>
                  <circle
                    cx="80"
                    cy="84"
                    r="13.5"
                    stroke="#A594F9"
                    strokeWidth="2.8"
                    fill="rgba(255, 255, 255, 0.12)"
                  />
                  <circle
                    cx="120"
                    cy="84"
                    r="13.5"
                    stroke="#A594F9"
                    strokeWidth="2.8"
                    fill="rgba(255, 255, 255, 0.12)"
                  />
                  <path
                    d="M93.5 84C96.5 81.5 103.5 81.5 106.5 84"
                    stroke="#A594F9"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </g>

                {mode === 'hydration' || mode === 'sleeping' ? (
                  <circle cx="100" cy="101" r="3.4" fill="#E11D48" />
                ) : mode === 'intervention' ? (
                  <path
                    d="M93 103C96 99.5 104 99.5 107 103"
                    stroke="#241C3D"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                ) : mode === 'celebrating' ? (
                  <path
                    d="M92 98C94 106 106 106 108 98Z"
                    fill="#F43F5E"
                    stroke="#241C3D"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M94 99.5C96.8 103.5 103.2 103.5 106 99.5"
                    stroke="#241C3D"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                )}

                {mode === 'hydration' && (
                  <g>
                    <path
                      d="M113 114L103 102"
                      stroke="#F472B6"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <rect
                      x="106"
                      y="112"
                      width="20"
                      height="26"
                      rx="5"
                      fill="#60A5FA"
                      stroke="#1E3A8A"
                      strokeWidth="2.5"
                    />
                    <rect
                      x="104"
                      y="110"
                      width="24"
                      height="5"
                      rx="2.5"
                      fill="#EFF6FF"
                    />
                  </g>
                )}

                {(mode === 'idle_studying' || mode === 'idle_reading') && (
                  <g>
                    <path
                      d="M68 164L100 156L132 164L100 172L68 164Z"
                      fill={mode === 'idle_reading' ? '#C4B5FD' : '#DDD6FE'}
                      stroke="#312E81"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="100"
                      y1="156"
                      x2="100"
                      y2="172"
                      stroke="#4338CA"
                      strokeWidth="2.5"
                    />
                  </g>
                )}
              </g>
            )}

            {/* CHARACTER 2: COZY LIBRARY (Barnaby — Cozy Library Owl) */}
            {resolvedCharacterId === 'cozy_library' && (
              <g>
                {/* Plump Owl Body */}
                <ellipse
                  cx="100"
                  cy="118"
                  rx="44"
                  ry="52"
                  fill="#8B5E3C"
                  stroke="#3E2723"
                  strokeWidth="3.2"
                />
                {/* Cream Feather Belly */}
                <ellipse cx="100" cy="128" rx="31" ry="36" fill="#FDE68A" />
                <path
                  d="M88 120Q100 126 112 120M84 134Q100 140 116 134M90 148Q100 154 110 148"
                  stroke="#B45309"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Owl Ear Tufts */}
                <polygon
                  points="62,68 50,44 78,58"
                  fill="#6D4C41"
                  stroke="#3E2723"
                  strokeWidth="2.8"
                />
                <polygon
                  points="138,68 150,44 122,58"
                  fill="#6D4C41"
                  stroke="#3E2723"
                  strokeWidth="2.8"
                />
                {/* Facial Disc */}
                <ellipse
                  cx="82"
                  cy="84"
                  rx="18"
                  ry="18"
                  fill="#FEF3C7"
                  stroke="#5D4037"
                  strokeWidth="2.5"
                />
                <ellipse
                  cx="118"
                  cy="84"
                  rx="18"
                  ry="18"
                  fill="#FEF3C7"
                  stroke="#5D4037"
                  strokeWidth="2.5"
                />
                {/* Knit Library Scarf */}
                <rect
                  x="64"
                  y="102"
                  width="72"
                  height="13"
                  rx="6.5"
                  fill="#9D174D"
                  stroke="#500724"
                  strokeWidth="2.5"
                />
                <rect
                  x="108"
                  y="110"
                  width="13"
                  height="24"
                  rx="5"
                  fill="#BE185D"
                  stroke="#500724"
                  strokeWidth="2.2"
                />
                {/* Wings by Mode */}
                {mode === 'bathroom' || mode === 'celebrating' ? (
                  <>
                    <path
                      d="M58 112C36 96 34 74 48 68"
                      fill="#6D4C41"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                    <path
                      d="M142 112C164 96 166 74 152 68"
                      fill="#6D4C41"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M56 110C46 126 50 148 64 154"
                      fill="#6D4C41"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                    <path
                      d="M144 110C154 126 150 148 136 154"
                      fill="#6D4C41"
                      stroke="#3E2723"
                      strokeWidth="3"
                    />
                  </>
                )}
                {/* Owl Eyes */}
                <g
                  style={
                    mode === 'idle_reading'
                      ? {
                          animation: 'mambo-eye-scan 2s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {mode === 'sleeping' ? (
                    <>
                      <path
                        d="M75 85C78 89 86 89 89 85"
                        stroke="#3E2723"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M111 85C114 89 122 89 125 85"
                        stroke="#3E2723"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <circle
                        cx="82"
                        cy="84"
                        r={mode === 'intervention' ? 7.5 : 6}
                        fill="#271713"
                      />
                      <circle cx="80" cy="81.5" r="2.2" fill="#FFFFFF" />
                      <circle
                        cx="118"
                        cy="84"
                        r={mode === 'intervention' ? 7.5 : 6}
                        fill="#271713"
                      />
                      <circle cx="116" cy="81.5" r="2.2" fill="#FFFFFF" />
                    </>
                  )}
                </g>
                {/* Brass Spectacles */}
                <circle
                  cx="82"
                  cy="84"
                  r="14"
                  stroke="#F59E0B"
                  strokeWidth="2.6"
                />
                <circle
                  cx="118"
                  cy="84"
                  r="14"
                  stroke="#F59E0B"
                  strokeWidth="2.6"
                />
                <line
                  x1="96"
                  y1="84"
                  x2="104"
                  y2="84"
                  stroke="#F59E0B"
                  strokeWidth="2.6"
                />
                {/* Owl Beak */}
                <polygon
                  points="100,88 94,96 100,103 106,96"
                  fill="#F59E0B"
                  stroke="#78350F"
                  strokeWidth="2"
                />
                {/* Mode Prop: Teacup or Library Tome */}
                {mode === 'hydration' && (
                  <rect
                    x="104"
                    y="122"
                    width="22"
                    height="20"
                    rx="6"
                    fill="#DDD6FE"
                    stroke="#4C1D95"
                    strokeWidth="2.4"
                  />
                )}
                {(mode === 'idle_studying' || mode === 'idle_reading') && (
                  <path
                    d="M66 164L100 154L134 164L100 173L66 164Z"
                    fill="#FDE68A"
                    stroke="#78350F"
                    strokeWidth="2.5"
                  />
                )}
              </g>
            )}

            {/* CHARACTER 3: NEON NIGHT (Byte — Neon Night Cyber-Cat) */}
            {resolvedCharacterId === 'neon_night' && (
              <g>
                {/* Tail */}
                <path
                  d="M138 156C158 152 164 132 152 120"
                  stroke="#312E81"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Cyber-Cat Body */}
                <path
                  d="M66 124C66 112 80 106 100 106C120 106 134 112 134 124L138 166H62L66 124Z"
                  fill="#1E1B4B"
                  stroke="#A594F9"
                  strokeWidth="2.8"
                />
                {/* Pointed Cat Ears with Neon Inner Glow */}
                <polygon
                  points="58,72 52,34 84,52"
                  fill="#1E1B4B"
                  stroke="#A594F9"
                  strokeWidth="2.8"
                />
                <polygon points="60,66 56,42 78,54" fill="#F472B6" />
                <polygon
                  points="142,72 148,34 116,52"
                  fill="#1E1B4B"
                  stroke="#A594F9"
                  strokeWidth="2.8"
                />
                <polygon points="140,66 144,42 122,54" fill="#F472B6" />
                {/* Cat Head */}
                <rect
                  x="54"
                  y="48"
                  width="92"
                  height="68"
                  rx="34"
                  fill="#2E1065"
                  stroke="#A594F9"
                  strokeWidth="3"
                />
                {/* Neon Cyber Visor */}
                <rect
                  x="64"
                  y="70"
                  width="72"
                  height="24"
                  rx="12"
                  fill="#09070E"
                  stroke="#C4B5FD"
                  strokeWidth="2.4"
                />
                {/* Glowing LED Eyes inside Visor */}
                <g
                  style={
                    mode === 'idle_reading'
                      ? {
                          animation: 'mambo-eye-scan 1.8s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {mode === 'sleeping' ? (
                    <>
                      <line
                        x1="74"
                        y1="82"
                        x2="88"
                        y2="82"
                        stroke="#A594F9"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <line
                        x1="112"
                        y1="82"
                        x2="126"
                        y2="82"
                        stroke="#A594F9"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : mode === 'intervention' ? (
                    <>
                      <circle cx="81" cy="82" r="6" fill="#F87171" />
                      <circle cx="119" cy="82" r="6" fill="#F87171" />
                    </>
                  ) : (
                    <>
                      <circle cx="81" cy="82" r="5.5" fill="#4ADE80" />
                      <circle cx="119" cy="82" r="5.5" fill="#4ADE80" />
                    </>
                  )}
                </g>
                {/* Whiskers & Cute W Mouth */}
                <path
                  d="M93 101Q96.5 105 100 101Q103.5 105 107 101"
                  stroke="#F472B6"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                {mode === 'hydration' && (
                  <rect
                    x="106"
                    y="112"
                    width="18"
                    height="24"
                    rx="5"
                    fill="#38BDF8"
                    stroke="#E0F2FE"
                    strokeWidth="2"
                  />
                )}
              </g>
            )}

            {/* CHARACTER 4: LAVENDER FOCUS (Mochi — Lavender Cloud Bunny) */}
            {resolvedCharacterId === 'lavender_focus' && (
              <g>
                {/* Long Lop Bunny Ears */}
                <ellipse
                  cx="50"
                  cy="96"
                  rx="12"
                  ry="32"
                  transform="rotate(14 50 96)"
                  fill="#EDE9FE"
                  stroke="#6D28D9"
                  strokeWidth="2.8"
                />
                <ellipse
                  cx="150"
                  cy="96"
                  rx="12"
                  ry="32"
                  transform="rotate(-14 150 96)"
                  fill="#EDE9FE"
                  stroke="#6D28D9"
                  strokeWidth="2.8"
                />
                {/* Fluffy Cloud Body */}
                <rect
                  x="60"
                  y="110"
                  width="80"
                  height="58"
                  rx="28"
                  fill="#C4B5FD"
                  stroke="#5B21B6"
                  strokeWidth="2.8"
                />
                {/* Bunny Head */}
                <ellipse
                  cx="100"
                  cy="82"
                  rx="44"
                  ry="38"
                  fill="#F5F3FF"
                  stroke="#5B21B6"
                  strokeWidth="3"
                />
                {/* Lavender Sprig on Head */}
                <path
                  d="M100 44C100 32 108 26 114 28"
                  stroke="#15803D"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="110" cy="28" r="4" fill="#A855F7" />
                <circle cx="116" cy="31" r="3.5" fill="#C084FC" />
                {/* Cheeks & Eyes */}
                <ellipse
                  cx="72"
                  cy="90"
                  rx="6"
                  ry="3.5"
                  fill="#F472B6"
                  opacity="0.6"
                />
                <ellipse
                  cx="128"
                  cy="90"
                  rx="6"
                  ry="3.5"
                  fill="#F472B6"
                  opacity="0.6"
                />
                <g
                  style={
                    mode === 'idle_reading'
                      ? {
                          animation: 'mambo-eye-scan 2.2s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {mode === 'sleeping' ? (
                    <>
                      <path
                        d="M76 82C79 86 85 86 88 82"
                        stroke="#3B0764"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M112 82C115 86 121 86 124 82"
                        stroke="#3B0764"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <circle cx="82" cy="80" r="5.5" fill="#3B0764" />
                      <circle cx="80.5" cy="78" r="2" fill="#FFFFFF" />
                      <circle cx="118" cy="80" r="5.5" fill="#3B0764" />
                      <circle cx="116.5" cy="78" r="2" fill="#FFFFFF" />
                    </>
                  )}
                </g>
                <path
                  d="M95 92Q100 96 105 92"
                  stroke="#3B0764"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {mode === 'hydration' && (
                  <rect
                    x="105"
                    y="112"
                    width="18"
                    height="22"
                    rx="6"
                    fill="#93C5FD"
                    stroke="#1E3A8A"
                    strokeWidth="2.2"
                  />
                )}
              </g>
            )}

            {/* CHARACTER 5: RETRO ARCADE (Pip — Retro CRT Sprout Bot) */}
            {resolvedCharacterId === 'retro_arcade' && (
              <g>
                {/* Top Sprout Antenna */}
                <line
                  x1="100"
                  y1="44"
                  x2="100"
                  y2="26"
                  stroke="#A594F9"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="108"
                  cy="26"
                  rx="8"
                  ry="4.5"
                  fill="#4ADE80"
                  stroke="#14532D"
                  strokeWidth="2"
                />
                {/* Pocket Console Casing */}
                <rect
                  x="52"
                  y="44"
                  width="96"
                  height="120"
                  rx="22"
                  fill="#4C1D95"
                  stroke="#C4B5FD"
                  strokeWidth="3.2"
                />
                {/* CRT Screen Face */}
                <rect
                  x="64"
                  y="56"
                  width="72"
                  height="56"
                  rx="12"
                  fill="#090D16"
                  stroke="#7C3AED"
                  strokeWidth="2.6"
                />
                {/* Pixel Screen Eyes & Mouth */}
                <g
                  style={
                    mode === 'idle_reading'
                      ? {
                          animation: 'mambo-eye-scan 1.9s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {mode === 'sleeping' ? (
                    <>
                      <rect
                        x="76"
                        y="80"
                        width="12"
                        height="3"
                        fill="#A594F9"
                      />
                      <rect
                        x="112"
                        y="80"
                        width="12"
                        height="3"
                        fill="#A594F9"
                      />
                    </>
                  ) : mode === 'intervention' ? (
                    <>
                      <rect
                        x="78"
                        y="72"
                        width="10"
                        height="12"
                        fill="#F87171"
                      />
                      <rect
                        x="112"
                        y="72"
                        width="10"
                        height="12"
                        fill="#F87171"
                      />
                    </>
                  ) : (
                    <>
                      <rect
                        x="78"
                        y="74"
                        width="9"
                        height="11"
                        rx="2"
                        fill="#4ADE80"
                      />
                      <rect
                        x="113"
                        y="74"
                        width="9"
                        height="11"
                        rx="2"
                        fill="#4ADE80"
                      />
                    </>
                  )}
                </g>
                <rect
                  x="92"
                  y="94"
                  width="16"
                  height="4"
                  rx="2"
                  fill="#4ADE80"
                />
                {/* Console D-Pad & A/B Buttons */}
                <path
                  d="M76 128H84V136H92V144H84V152H76V144H68V136H76V128Z"
                  fill="#DDD6FE"
                />
                <circle cx="118" cy="144" r="6" fill="#F472B6" />
                <circle cx="130" cy="134" r="6" fill="#A594F9" />
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Optional Bottom State Badge */}
      {showStateBadge && (
        <div className="relative z-10 mt-1 text-center">
          <span
            className={`inline-block rounded-full bg-[#171326]/90 border border-[#322A4B] px-3 py-0.5 font-semibold tracking-tight text-[#D8D3F0] ${sizeConfig.badgeText}`}
          >
            {meta.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default ChibiCompanion;
