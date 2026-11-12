import React from 'react';
import { motion } from 'motion/react';
import { Dumbbell, Wheat, Droplets } from 'lucide-react';

interface MacroBarsProps {
  totals: {
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MacroItemProps {
  label: string;
  consumed: number;
  target: number;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
}

const MacroItem: React.FC<MacroItemProps> = ({
  label,
  consumed,
  target,
  icon,
  gradient,
  glowColor,
}) => {
  const safeTarget = Math.max(1, target);
  const percentage = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const remaining = Math.max(0, safeTarget - consumed);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <span className="p-1 rounded-lg bg-white/10 text-white/90">{icon}</span>
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2 tabular-nums">
          <span className="font-semibold text-white">
            {consumed}
            <span className="text-slate-400 font-normal"> / {target}g</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
            {remaining}g left
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-md border border-white/10 relative">
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: gradient,
            boxShadow: `0 0 12px ${glowColor}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 45,
            damping: 14,
          }}
        >
          {/* Subtle specular highlight on the progress pill */}
          <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};

export const MacroBars: React.FC<MacroBarsProps> = ({ totals, targets }) => {
  return (
    <div className="glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          Macronutrient Breakdown
        </h3>
        <span className="text-[11px] text-slate-400">Grams Consumed</span>
      </div>

      <div className="space-y-4 pt-1">
        {/* Protein */}
        <MacroItem
          label="Protein"
          consumed={totals.protein}
          target={targets.protein}
          icon={<Dumbbell className="w-3.5 h-3.5 text-[#FF5E7E]" />}
          gradient="linear-gradient(90deg, #FF5E7E 0%, #FF8C66 100%)"
          glowColor="rgba(255, 94, 126, 0.4)"
        />

        {/* Carbs */}
        <MacroItem
          label="Carbohydrates"
          consumed={totals.carbs}
          target={targets.carbs}
          icon={<Wheat className="w-3.5 h-3.5 text-[#FFAE42]" />}
          gradient="linear-gradient(90deg, #FFAE42 0%, #FFD166 100%)"
          glowColor="rgba(255, 174, 66, 0.4)"
        />

        {/* Fat */}
        <MacroItem
          label="Dietary Fat"
          consumed={totals.fat}
          target={targets.fat}
          icon={<Droplets className="w-3.5 h-3.5 text-[#4E65FF]" />}
          gradient="linear-gradient(90deg, #92EFFD 0%, #4E65FF 100%)"
          glowColor="rgba(78, 101, 255, 0.35)"
        />
      </div>
    </div>
  );
};
