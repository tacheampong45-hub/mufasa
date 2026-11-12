import React from 'react';
import { motion } from 'motion/react';
import { Zap, Sparkles } from 'lucide-react';

interface CalorieRingProps {
  consumed: number;
  target: number;
  goal: 'lose' | 'maintain' | 'gain';
}

export const CalorieRing: React.FC<CalorieRingProps> = ({ consumed, target, goal }) => {
  const safeTarget = Math.max(1, target);
  const percentage = Math.min(150, Math.round((consumed / safeTarget) * 100));
  const remaining = safeTarget - consumed;
  const isSurplus = remaining < 0;

  // SVG circular dimensions
  const size = 260;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress clamped between 0 and 1 for strokeDashoffset (or up to 1.3 for surplus)
  const progressRatio = Math.min(1, Math.max(0, consumed / safeTarget));
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
      {/* Background radial glow behind ring */}
      <div 
        className="absolute w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          background: isSurplus 
            ? 'radial-gradient(circle, #FF5E7E 0%, transparent 70%)'
            : 'radial-gradient(circle, #FF8C66 0%, #FFAE42 50%, transparent 80%)',
        }}
      />

      <div className="w-full flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#FFAE42]" />
          Daily Fuel Burn
        </span>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-orange-200 border border-white/10 tabular-nums">
          {percentage}% Target
        </span>
      </div>

      <div className="relative flex items-center justify-center my-3">
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            {/* Sunset Glow dynamic gradient */}
            <linearGradient id="calorieGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFAE42" />
              <stop offset="50%" stopColor="#FF8C66" />
              <stop offset="100%" stopColor="#FF5E7E" />
            </linearGradient>

            {/* Surplus warning gradient */}
            <linearGradient id="calorieSurplus" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF5E7E" />
              <stop offset="100%" stopColor="#FF2A55" />
            </linearGradient>

            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF8C66" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isSurplus ? 'url(#calorieSurplus)' : 'url(#calorieGlow)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{
              type: 'spring',
              stiffness: 45,
              damping: 15,
              mass: 1,
            }}
            filter="url(#ringGlow)"
          />
        </svg>

        {/* Center Ring Information */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-4">
          <motion.span 
            className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {consumed}
          </motion.span>
          <span className="text-xs uppercase font-medium tracking-wider text-slate-400 mt-0.5">
            kcal eaten
          </span>

          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
            <Sparkles className="w-3 h-3 text-[#FFAE42]" />
            <span className="text-xs font-semibold text-slate-200 tabular-nums">
              {isSurplus ? `+${Math.abs(remaining)} surplus` : `${remaining} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Target Bar Indicator */}
      <div className="w-full mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div>
          <span>Target: </span>
          <strong className="text-slate-200 tabular-nums font-semibold">{safeTarget} kcal</strong>
        </div>
        <div>
          <span>Goal: </span>
          <strong className="text-orange-300 font-semibold capitalize">
            {goal === 'lose' ? 'Fat Loss' : goal === 'gain' ? 'Muscle Hypertrophy' : 'Maintenance'}
          </strong>
        </div>
      </div>
    </div>
  );
};
