import React, { useState } from 'react';
import { FoodItem, MealType } from '../types/nutrition';
import { Coffee, Sun, Moon, Cookie, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealSectionProps {
  mealType: MealType;
  items: FoodItem[];
  onRemoveItem: (mealType: MealType, itemId: string) => void;
  onQuickAddTrigger: (mealType: MealType) => void;
}

const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: React.ReactNode; color: string; timeHint: string }
> = {
  breakfast: {
    label: 'Breakfast',
    icon: <Coffee className="w-4 h-4 text-amber-300" />,
    color: 'from-amber-400 to-orange-400',
    timeHint: 'Morning Fuel',
  },
  lunch: {
    label: 'Lunch',
    icon: <Sun className="w-4 h-4 text-orange-400" />,
    color: 'from-orange-400 to-rose-400',
    timeHint: 'Midday Energy',
  },
  dinner: {
    label: 'Dinner',
    icon: <Moon className="w-4 h-4 text-rose-400" />,
    color: 'from-rose-400 to-purple-400',
    timeHint: 'Evening Recovery',
  },
  snacks: {
    label: 'Snacks',
    icon: <Cookie className="w-4 h-4 text-pink-300" />,
    color: 'from-pink-400 to-orange-300',
    timeHint: 'Active Boosts',
  },
};

export const MealSection: React.FC<MealSectionProps> = ({
  mealType,
  items,
  onRemoveItem,
  onQuickAddTrigger,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = MEAL_CONFIG[mealType];

  const totalCalories = items.reduce((sum, it) => sum + (it.calories || 0), 0);
  const totalProtein = items.reduce((sum, it) => sum + (it.protein || 0), 0);
  const totalCarbs = items.reduce((sum, it) => sum + (it.carbs || 0), 0);
  const totalFat = items.reduce((sum, it) => sum + (it.fat || 0), 0);

  return (
    <div className="glass-panel rounded-3xl overflow-hidden shadow-xl transition-all">
      {/* Header bar */}
      <div className="p-4 sm:px-5 flex items-center justify-between gap-3 border-b border-white/5">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 cursor-pointer select-none group flex-1"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {config.label}
              </h4>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                {config.timeHint}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
              <strong className="text-orange-200">{totalCalories} kcal</strong>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 text-[11px]">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickAddTrigger(mealType)}
            className="glass-button-secondary p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1"
            title={`Add food to ${config.label}`}
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Meal Items List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 sm:p-4 space-y-2"
          >
            {items.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <span>No foods logged for {config.label.toLowerCase()} yet.</span>
                <button
                  type="button"
                  onClick={() => onQuickAddTrigger(mealType)}
                  className="text-orange-300 hover:text-orange-200 font-medium text-[11px] underline underline-offset-4"
                >
                  Log what you ate
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="glass-card-interactive rounded-2xl p-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate shrink-0">
                            ({item.portion})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 tabular-nums mt-0.5">
                          <span className="text-rose-300 font-medium">P: {item.protein}g</span>
                          <span>·</span>
                          <span className="text-amber-300 font-medium">C: {item.carbs}g</span>
                          <span>·</span>
                          <span className="text-blue-300 font-medium">F: {item.fat}g</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-white tabular-nums px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                          {item.calories} <span className="text-[9px] text-slate-400 font-normal">kcal</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(mealType, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete food entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal Macro Strip */}
                <div className="mt-2 pt-2 px-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>Meal Macro Totals:</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-rose-300">P: <strong className="text-white">{totalProtein}g</strong></span>
                    <span className="text-amber-300">C: <strong className="text-white">{totalCarbs}g</strong></span>
                    <span className="text-blue-300">F: <strong className="text-white">{totalFat}g</strong></span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
