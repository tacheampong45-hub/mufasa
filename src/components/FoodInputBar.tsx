import React, { useState } from 'react';
import { MealType, QuickAddFood } from '../types/nutrition';
import { Sparkles, ArrowRight, Loader2, AlertCircle, Plus, Clock } from 'lucide-react';

interface FoodInputBarProps {
  quickFoods: QuickAddFood[];
  onDirectAddFood: (food: QuickAddFood) => void;
  onParseFoodText: (text: string, mealType: MealType) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const FoodInputBar: React.FC<FoodInputBarProps> = ({
  quickFoods,
  onDirectAddFood,
  onParseFoodText,
  isLoading,
  error,
  onClearError,
}) => {
  const [inputText, setInputText] = useState('');
  const [targetMeal, setTargetMeal] = useState<MealType>('breakfast');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onClearError();
    await onParseFoodText(inputText.trim(), targetMeal);
    setInputText('');
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <label className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-5 h-5 rounded-lg bg-gradient-to-tr from-[#FF8C66] to-[#FF5E7E] flex items-center justify-center text-white">
            <Sparkles className="w-3 h-3" />
          </span>
          Natural Language Meal Logger
        </label>

        {/* Meal Category Segmented Control */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
          {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => setTargetMeal(meal)}
              className={`px-3 py-1 text-xs font-semibold rounded-xl capitalize transition-all ${
                targetMeal === meal
                  ? 'bg-gradient-to-r from-[#FF8C66] to-[#FF5E7E] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {meal}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Input Bar Form */}
      <form onSubmit={handleSubmit} className="relative mt-2">
        <div className="relative flex items-center">
          <input
            type="text"
            disabled={isLoading}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (error) onClearError();
            }}
            placeholder='e.g., "Two poached eggs, avocado sourdough toast, and a matcha latte"'
            className="glass-input w-full rounded-2xl py-3.5 pl-4 pr-28 text-sm text-white placeholder-slate-400 focus:outline-none transition-all"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="glass-button-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing</span>
                </>
              ) : (
                <>
                  <span>Log</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 bg-white/15 rounded-lg" />
            <div className="h-4 w-20 bg-white/10 rounded-lg" />
          </div>
          <div className="h-3 w-64 bg-white/10 rounded-lg" />
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="h-10 bg-white/10 rounded-xl" />
            <div className="h-10 bg-white/10 rounded-xl" />
            <div className="h-10 bg-white/10 rounded-xl" />
            <div className="h-10 bg-white/10 rounded-xl" />
          </div>
        </div>
      )}

      {/* Error / Retry message */}
      {error && (
        <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="text-xs font-bold text-white bg-rose-500/30 hover:bg-rose-500/50 px-3 py-1 rounded-xl transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Add Chips for recent and frequent foods */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#FFAE42]" />
            Quick Add & Recent
          </span>
          <span className="text-[10px] text-slate-500">Tap to instantly add to {targetMeal}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {quickFoods.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onDirectAddFood({ ...q, mealType: targetMeal })}
              className="glass-pill rounded-xl px-3 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-white/15 active:scale-95 transition-all shrink-0 flex items-center gap-1.5 group"
            >
              <Plus className="w-3 h-3 text-orange-400 group-hover:rotate-90 transition-transform" />
              <span className="font-medium">{q.name}</span>
              <span className="text-[10px] text-orange-300 font-semibold tabular-nums ml-0.5">
                {q.calories} cal
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
