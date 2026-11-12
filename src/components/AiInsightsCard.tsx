import React, { useState } from 'react';
import { Sparkles, RefreshCw, Lightbulb, Compass, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AiInsightsCardProps {
  insight?: {
    summary: string;
    suggestion: string;
    generatedAt: string;
  };
  onGenerateInsights: () => Promise<void>;
  isLoading: boolean;
  caloriesRemaining: number;
}

export const AiInsightsCard: React.FC<AiInsightsCardProps> = ({
  insight,
  onGenerateInsights,
  isLoading,
  caloriesRemaining,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      setError(null);
      await onGenerateInsights();
    } catch (err) {
      console.error(err);
      setError('Unable to refresh insights. Please try again.');
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background soft glow accent */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #FFAE42 0%, #FF8C66 60%, transparent 100%)',
        }}
      />

      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FFAE42] to-[#FF5E7E] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Gemini AI Nutrition Coach
            </h3>
            <span className="text-[10px] text-slate-400">
              Personalized pacing & next meal recommendation
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleRefresh}
          className="glass-button-secondary p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"
          title="Refresh AI Insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-orange-300 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 pt-1 animate-pulse">
          <div className="h-4 bg-white/10 rounded-xl w-3/4" />
          <div className="h-4 bg-white/10 rounded-xl w-5/6" />
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 mt-2">
            <div className="h-3.5 bg-white/15 rounded-lg w-1/3" />
            <div className="h-3.5 bg-white/10 rounded-lg w-full" />
          </div>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs font-bold text-white bg-rose-500/25 px-2.5 py-1 rounded-lg hover:bg-rose-500/40"
          >
            Retry
          </button>
        </div>
      ) : insight ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {insight.summary}
          </p>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-400/20 text-orange-300 shrink-0 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-200 block">
                Next Meal Suggestion:
              </span>
              <p className="text-xs text-slate-300 leading-normal mt-0.5">
                {insight.suggestion}
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <Compass className="w-6 h-6 text-slate-500" />
          <span>
            {caloriesRemaining > 0
              ? `You have ${caloriesRemaining} kcal remaining today.`
              : 'You have hit your daily calorie target!'}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs font-semibold text-orange-300 hover:text-orange-200 underline underline-offset-4"
          >
            Generate AI daily summary & suggestion
          </button>
        </div>
      )}
    </div>
  );
};
