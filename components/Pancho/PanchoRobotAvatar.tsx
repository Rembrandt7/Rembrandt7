import React from 'react';
import { motion } from 'motion/react';

export type PanchoState = 'idle' | 'working' | 'success' | 'error' | 'attention';

interface PanchoRobotAvatarProps {
  state?: PanchoState;
  size?: number;
  className?: string;
  showTail?: boolean;
}

export const PanchoRobotAvatar: React.FC<PanchoRobotAvatarProps> = ({
  state = 'idle',
  size = 48,
  className = '',
  showTail = true,
}) => {
  // Eye expression variants based on state
  const renderEyes = () => {
    switch (state) {
      case 'working':
        // Animated scanning loader visor
        return (
          <g>
            <motion.rect
              x="26"
              y="39"
              width="14"
              height="8"
              rx="4"
              fill="#f59e0b"
              animate={{
                x: [24, 62, 24],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              filter="url(#glow-amber)"
            />
            {/* Thinking dots */}
            <circle cx="34" cy="43" r="1.5" fill="#fef3c7" />
            <circle cx="50" cy="43" r="1.5" fill="#fef3c7" />
            <circle cx="66" cy="43" r="1.5" fill="#fef3c7" />
          </g>
        );

      case 'success':
        // Happy arched eyes (^ ^)
        return (
          <g filter="url(#glow-emerald)">
            <motion.path
              d="M30 45 Q36 37 42 45"
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.path
              d="M58 45 Q64 37 70 45"
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
            {/* Cute blush cheeks */}
            <circle cx="28" cy="49" r="2.5" fill="#34d399" opacity="0.6" />
            <circle cx="72" cy="49" r="2.5" fill="#34d399" opacity="0.6" />
          </g>
        );

      case 'error':
        // X_X / Disappointed eyes
        return (
          <g filter="url(#glow-red)">
            {/* Left X */}
            <line x1="31" y1="39" x2="41" y2="47" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="41" y1="39" x2="31" y2="47" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            {/* Right X */}
            <line x1="59" y1="39" x2="69" y2="47" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <line x1="69" y1="39" x2="59" y2="47" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          </g>
        );

      case 'attention':
        // Big curious round eyes with exclamation (O_O !)
        return (
          <g filter="url(#glow-cyan)">
            <circle cx="36" cy="43" r="6" fill="#38bdf8" />
            <circle cx="38" cy="41" r="2.2" fill="#ffffff" />
            <circle cx="64" cy="43" r="6" fill="#38bdf8" />
            <circle cx="66" cy="41" r="2.2" fill="#ffffff" />
          </g>
        );

      case 'idle':
      default:
        // Friendly blinking cyan puppy eyes
        return (
          <g filter="url(#glow-cyan)">
            <motion.ellipse
              cx="36"
              cy="43"
              rx="5"
              ry="6"
              fill="#06b6d4"
              animate={{
                ry: [6, 6, 0.8, 6, 6],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                times: [0, 0.45, 0.5, 0.55, 1],
              }}
            >
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
            </motion.ellipse>
            <circle cx="38" cy="41" r="1.8" fill="#ffffff" />

            <motion.ellipse
              cx="64"
              cy="43"
              rx="5"
              ry="6"
              fill="#06b6d4"
              animate={{
                ry: [6, 6, 0.8, 6, 6],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                times: [0, 0.45, 0.5, 0.55, 1],
              }}
            >
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
            </motion.ellipse>
            <circle cx="66" cy="41" r="1.8" fill="#ffffff" />
          </g>
        );
    }
  };

  // Ear movements per state
  const leftEarRotation = state === 'success' ? -22 : state === 'attention' ? -28 : state === 'error' ? 12 : -10;
  const rightEarRotation = state === 'success' ? 22 : state === 'attention' ? 8 : state === 'error' ? -12 : 10;

  // Head bobbing / motion based on state
  const headAnimate = () => {
    switch (state) {
      case 'working':
        return { y: [0, -3, 0], rotate: [0, 1.5, -1.5, 0] };
      case 'success':
        return { y: [0, -6, 0], rotate: [0, -3, 3, 0] };
      case 'error':
        return { x: [-3, 3, -2, 2, 0], y: [0, 1, 0] };
      case 'attention':
        return { rotate: [-5, 6, -5], y: [0, -2, 0] };
      case 'idle':
      default:
        return { y: [0, -2, 0] };
    }
  };

  const headTransition = () => {
    switch (state) {
      case 'working':
        return { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      case 'success':
        return { repeat: 3, duration: 0.6, ease: 'easeInOut' };
      case 'error':
        return { duration: 0.5 };
      case 'attention':
        return { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      case 'idle':
      default:
        return { repeat: Infinity, duration: 3, ease: 'easeInOut' };
    }
  };

  // Antenna LED tip color
  const antennaColor = 
    state === 'working' ? '#f59e0b' :
    state === 'success' ? '#10b981' :
    state === 'error' ? '#ef4444' :
    state === 'attention' ? '#a855f7' :
    '#06b6d4';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
        animate={headAnimate()}
        transition={headTransition()}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="robot-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="ear-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="ear-inner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="screen-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="collar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Wagging Tail (Behind head) */}
        {showTail && (
          <motion.g
            animate={{
              rotate: state === 'success' || state === 'working' ? [-25, 25, -25] : [-8, 8, -8],
            }}
            transition={{
              repeat: Infinity,
              duration: state === 'success' ? 0.35 : state === 'working' ? 0.5 : 1.4,
              ease: "easeInOut",
            }}
            style={{ originX: '85px', originY: '75px' }}
          >
            {/* Segmented robot tail */}
            <path
              d="M78 72 Q88 64 92 50 Q94 44 91 38"
              fill="none"
              stroke="#475569"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Tail tip glowing ball */}
            <circle
              cx="91"
              cy="38"
              r="4.5"
              fill={antennaColor}
              filter={state === 'working' ? 'url(#glow-amber)' : 'url(#glow-cyan)'}
            />
          </motion.g>
        )}

        {/* Robot Dog Ears */}
        {/* Left Ear */}
        <motion.g
          animate={{ rotate: leftEarRotation }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          style={{ originX: '28px', originY: '24px' }}
        >
          {/* Ear outer shell */}
          <path
            d="M28 24 C14 16, 4 36, 12 56 C16 62, 25 54, 28 44 Z"
            fill="url(#ear-metal)"
            stroke="#64748b"
            strokeWidth="1.5"
          />
          {/* Ear inner LED cyber plate */}
          <path
            d="M24 28 C16 24, 10 38, 16 50 C18 54, 23 48, 25 40 Z"
            fill="url(#ear-inner)"
          />
          {/* Bolt rivet */}
          <circle cx="28" cy="24" r="2.5" fill="#94a3b8" />
          <circle cx="28" cy="24" r="1.2" fill="#1e293b" />
        </motion.g>

        {/* Right Ear */}
        <motion.g
          animate={{ rotate: rightEarRotation }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          style={{ originX: '72px', originY: '24px' }}
        >
          {/* Ear outer shell */}
          <path
            d="M72 24 C86 16, 96 36, 88 56 C84 62, 75 54, 72 44 Z"
            fill="url(#ear-metal)"
            stroke="#64748b"
            strokeWidth="1.5"
          />
          {/* Ear inner LED cyber plate */}
          <path
            d="M76 28 C84 24, 90 38, 84 50 C82 54, 77 48, 75 40 Z"
            fill="url(#ear-inner)"
          />
          {/* Bolt rivet */}
          <circle cx="72" cy="24" r="2.5" fill="#94a3b8" />
          <circle cx="72" cy="24" r="1.2" fill="#1e293b" />
        </motion.g>

        {/* Antenna Stem */}
        <line x1="50" y1="18" x2="50" y2="7" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <line x1="47" y1="12" x2="53" y2="12" stroke="#94a3b8" strokeWidth="1.5" />

        {/* Antenna LED Tip (Glows based on state) */}
        <motion.circle
          cx="50"
          cy="6"
          r="4.5"
          fill={antennaColor}
          animate={{
            scale: state === 'working' ? [1, 1.4, 1] : state === 'attention' ? [1, 1.3, 1] : [1, 1.1, 1],
            opacity: state === 'working' ? [0.8, 1, 0.8] : [0.9, 1, 0.9],
          }}
          transition={{
            repeat: Infinity,
            duration: state === 'working' ? 0.6 : state === 'attention' ? 0.8 : 2,
          }}
          filter="url(#glow-cyan)"
        />

        {/* Attention badge exclamation marker on antenna */}
        {state === 'attention' && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <circle cx="68" cy="10" r="7" fill="#ef4444" />
            <text x="68" y="14" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">!</text>
          </motion.g>
        )}

        {/* Main Robot Head Plate */}
        <rect
          x="20"
          y="18"
          width="60"
          height="54"
          rx="22"
          fill="url(#robot-metal)"
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Head Side Rivets */}
        <circle cx="24" cy="30" r="1.8" fill="#94a3b8" />
        <circle cx="24" cy="58" r="1.8" fill="#94a3b8" />
        <circle cx="76" cy="30" r="1.8" fill="#94a3b8" />
        <circle cx="76" cy="58" r="1.8" fill="#94a3b8" />

        {/* Visor Screen Glass */}
        <rect
          x="24"
          y="28"
          width="52"
          height="28"
          rx="12"
          fill="url(#screen-gradient)"
          stroke="#0284c7"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* Glass reflection streak */}
        <path
          d="M 28 32 Q 50 30 72 32"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.25"
          fill="none"
        />

        {/* Dynamic LED Eyes on Visor */}
        {renderEyes()}

        {/* Puppy Snout / Muzzle Area */}
        <g>
          {/* Muzzle Plate */}
          <rect
            x="36"
            y="56"
            width="28"
            height="18"
            rx="9"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.2"
          />

          {/* Cute Robot Nose */}
          <path
            d="M47 60 Q50 58 53 60 L51 63 Q50 64 49 63 Z"
            fill={antennaColor}
            filter="url(#glow-cyan)"
          />

          {/* Mouth line */}
          <path
            d={
              state === 'error'
                ? "M45 69 Q50 65 55 69"
                : state === 'success'
                ? "M44 67 Q50 72 56 67"
                : "M45 68 Q50 70 55 68"
            }
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Whisker sensor dots */}
          <circle cx="40" cy="64" r="0.9" fill="#64748b" />
          <circle cx="42" cy="67" r="0.9" fill="#64748b" />
          <circle cx="60" cy="64" r="0.9" fill="#64748b" />
          <circle cx="58" cy="67" r="0.9" fill="#64748b" />
        </g>

        {/* Robot Collar & Medal */}
        <path
          d="M28 72 Q50 79 72 72"
          fill="none"
          stroke="url(#collar-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Collar Tag / Medal "P" for Pancho */}
        <g>
          <circle cx="50" cy="78" r="5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
          <text
            x="50"
            y="81.5"
            fill="#78350f"
            fontSize="6.5"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            P
          </text>
        </g>
      </motion.svg>
    </div>
  );
};

export default PanchoRobotAvatar;
