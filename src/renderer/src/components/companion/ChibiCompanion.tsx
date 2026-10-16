// src/renderer/src/components/companion/ChibiCompanion.tsx
import React from 'react';

export type ChibiCompanionMode =
  | 'idle_studying'
  | 'hydration'
  | 'bathroom'
  | 'intervention'
  | 'celebrating';

export type ChibiCompanionSize = 'sm' | 'md' | 'lg';

export interface ChibiCompanionProps {
  mode: ChibiCompanionMode;
  size?: ChibiCompanionSize;
  className?: string;
  showStateBadge?: boolean;
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
  hydration: {
    label: 'Reminder · Drinking water',
    glowColor: 'rgba(96, 165, 250, 0.22)',
    ringColor: 'border-[#3B5284]',
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
  celebrating: {
    label: 'Great Job · Celebrating!',
    glowColor: 'rgba(74, 222, 128, 0.22)',
    ringColor: 'border-[#2E6B56]',
    bodyAnimation: 'mambo-bounce 1.1s ease-in-out infinite',
  },
};

export const ChibiCompanion: React.FC<ChibiCompanionProps> = ({
  mode,
  size = 'lg',
  className = '',
  showStateBadge = size === 'lg',
}) => {
  const sizeConfig = SIZE_CLASSES[size];
  const meta = MODE_META[mode];

  return (
    <div
      data-companion-mode={mode}
      className={`relative mx-auto flex flex-col items-center justify-center bg-[#0D0B14] border ${meta.ringColor} select-none overflow-hidden transition-all duration-300 ${sizeConfig.container} ${className}`}
    >
      {/* Embedded Scoped Keyframes for Vector Mascot Animations */}
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
          className="pointer-events-none absolute h-3/4 w-3/4 rounded-full border-2 border-rose-500/45"
          style={{ animation: 'mambo-pulse-ring 1.6s ease-out infinite' }}
        />
      )}

      {/* Vector Chibi Character Illustration */}
      <div
        className="relative z-10 flex items-center justify-center"
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

          {/* Mode-Specific Background Particles (Droplets / Sparkles / Alert Icons) */}
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

          {mode === 'celebrating' && (
            <g>
              <path
                d="M40 50L43 58L51 61L43 64L40 72L37 64L29 61L37 58L40 50Z"
                fill="#FDE047"
                style={{
                  transformOrigin: '40px 61px',
                  animation: 'mambo-sparkle-twinkle 1.4s ease-in-out infinite',
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
              {/* Exclamation Badge */}
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

          {/* Chibi Hoodie / Torso Outfit */}
          <path
            d="M62 132C62 119 78 112 100 112C122 112 138 119 138 132L144 166C144 170 140 173 135 173H65C60 173 56 170 56 166L62 132Z"
            fill="#5B4B9A"
            stroke="#2B224C"
            strokeWidth="3"
          />

          {/* Cozy Collar & Academic Ribbon Detail */}
          <path
            d="M82 115L100 129L118 115"
            stroke="#DDD6FE"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon points="100,127 94,142 100,147 106,142" fill="#F472B6" />

          {/* Left & Right Arms Based on Posture Mode */}
          {mode === 'bathroom' || mode === 'celebrating' ? (
            <>
              {/* Raised Waving / Stretching Arms */}
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
              {/* Left Arm Relaxed, Right Arm Holding Water Cup */}
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
              {/* Crossed / Stop Gesture Arms */}
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
              {/* Calm Studying Arms Resting on Desk/Book */}
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

          {/* Chibi Head & Cute Ears/Tufts */}
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

          {/* Main Round Chibi Face */}
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

          {/* Hair Cap & Front Fringe */}
          <path
            d="M54 74C54 51 74 38 100 38C126 38 146 51 146 74C138 64 127 59 115 64C108 56 93 56 85 64C73 59 62 64 54 74Z"
            fill="#3B305E"
            stroke="#241C3D"
            strokeWidth="3"
          />
          {/* Top Hair Sprout/Ahoge */}
          <path
            d="M100 38C98 27 107 22 114 26"
            stroke="#3B305E"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Rosy Chibi Cheeks */}
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

          {/* Eyes (Animated Blink in Idle Mode, Expressive in Others) */}
          <g
            style={
              mode === 'idle_studying'
                ? {
                    transformOrigin: '100px 84px',
                    animation: 'mambo-blink 4.2s infinite',
                  }
                : undefined
            }
          >
            {mode === 'celebrating' || mode === 'bathroom' ? (
              <>
                {/* Happy Curved Eyes */}
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
                {/* Wide Alert Eyes + Furrowed Brows */}
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
                {/* Calm Focused Chibi Eyes with Catchlights */}
                <circle cx="80" cy="84" r="5.8" fill="#241C3D" />
                <circle cx="78.2" cy="82" r="2" fill="#FFFFFF" />
                <circle cx="120" cy="84" r="5.8" fill="#241C3D" />
                <circle cx="118.2" cy="82" r="2" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* Signature Round Chibi Glasses */}
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
            {/* Glasses Bridge */}
            <path
              d="M93.5 84C96.5 81.5 103.5 81.5 106.5 84"
              stroke="#A594F9"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>

          {/* Mouth Expression */}
          {mode === 'hydration' ? (
            /* Sipping 'o' mouth */
            <circle cx="100" cy="101" r="3.6" fill="#E11D48" />
          ) : mode === 'intervention' ? (
            /* Concerned wavy nudge mouth */
            <path
              d="M93 103C96 99.5 104 99.5 107 103"
              stroke="#241C3D"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          ) : mode === 'celebrating' ? (
            /* Wide joyful smile */
            <path
              d="M92 98C94 106 106 106 108 98Z"
              fill="#F43F5E"
              stroke="#241C3D"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ) : (
            /* Gentle friendly smile */
            <path
              d="M94 99.5C96.8 103.5 103.2 103.5 106 99.5"
              stroke="#241C3D"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}

          {/* Mode Props: Hydration Cup or Study Book */}
          {mode === 'hydration' && (
            <g>
              {/* Straw */}
              <path
                d="M113 114L103 102"
                stroke="#F472B6"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              {/* Water Tumbler */}
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
              <path
                d="M110 124C113 122 119 122 122 124"
                stroke="#DBEAFE"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}

          {mode === 'idle_studying' && (
            <g>
              {/* Open Study Notebook Prop */}
              <path
                d="M68 164L100 156L132 164L100 172L68 164Z"
                fill="#DDD6FE"
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
        </svg>
      </div>

      {/* Optional Bottom State Badge (Shown on lg card view) */}
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