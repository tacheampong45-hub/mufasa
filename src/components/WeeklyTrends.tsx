import React from 'react';
import { DayLog } from '../types/nutrition';
import { BarChart3, TrendingUp, CalendarDays } from 'lucide-react';

interface WeeklyTrendsProps {
  logs: DayLog[]; // 7 days of logs
  targetCalories: number;
  currentDate: string;
  onSelectDate: (date: string) => void;
}

export const WeeklyTrends: React.FC<WeeklyTrendsProps> = ({
  logs,
  targetCalories,
  currentDate,
  onSelectDate,
}) => {
  // Calculate daily totals for each of the 7 days
  const dailyData = logs.map((log) => {
    const allItems = [
      ...log.meals.breakfast,
      ...log.meals.lunch,
      ...log.meals.dinner,
      ...log.meals.snacks,
    ];
    const calories = allItems.reduce((acc, it) => acc + (it.calories || 0), 0);
    const protein = allItems.reduce((acc, it) => acc + (it.protein || 0), 0);
    const carbs = allItems.reduce((acc, it) => acc + (it.carbs || 0), 0);
    const fat = allItems.reduce((acc, it) => acc + (it.fat || 0), 0);

    const d = new Date(log.date + 'T00:00:00');
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const shortDate = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

    return {
      date: log.date,
      dayLabel,
      shortDate,
      calories,
      protein,
      carbs,
      fat,
      isSelected: log.date === currentDate,
    };
  });

  const maxCalorieValue = Math.max(
    targetCalories * 1.25,
    ...dailyData.map((d) => d.calories),
    1500
  );

  // Compute 7-day average macro split
  const totalP = dailyData.reduce((acc, d) => acc + d.protein, 0);
  const totalC = dailyData.reduce((acc, d) => acc + d.carbs, 0);
  const totalF = dailyData.reduce((acc, d) => acc + d.fat, 0);

  // Calorie contribution: Protein (4), Carbs (4), Fat (9)
  const pCal = totalP * 4;
  const cCal = totalC * 4;
  const fCal = totalF * 9;
  const totalMacroCal = pCal + cCal + fCal;

  const pPct = totalMacroCal > 0 ? Math.round((pCal / totalMacroCal) * 100) : 30;
  const cPct = totalMacroCal > 0 ? Math.round((cCal / totalMacroCal) * 100) : 45;
  const fPct = totalMacroCal > 0 ? 100 - pPct - cPct : 25;

  const avgCalories = Math.round(
    dailyData.reduce((acc, d) => acc + d.calories, 0) / dailyData.length
  );

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FFAE42] to-[#FF8C66] flex items-center justify-center text-white shadow-md">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Weekly Calorie Pacing
            </h3>
            <span className="text-[10px] text-slate-400">
              7-Day history vs {targetCalories} kcal daily target
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 tabular-nums">
            7-Day Avg: <strong className="text-white font-semibold">{avgCalories} kcal</strong>
          </span>
        </div>
      </div>

      {/* Chart Graphic Area */}
      <div className="relative pt-6 pb-2">
        {/* Target Line Guideline */}
        <div
          className="absolute inset-x-0 border-b border-dashed border-orange-400/50 flex items-center justify-end pr-2 pointer-events-none"
          style={{
            bottom: `${(targetCalories / maxCalorieValue) * 170 + 36}px`,
          }}
        >
          <span className="text-[10px] font-semibold text-orange-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm tabular-nums">
            Target {targetCalories} kcal
          </span>
        </div>

        {/* Daily Bars Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-[180px] px-1">
          {dailyData.map((day) => {
            const barHeightPct = Math.min(100, Math.round((day.calories / maxCalorieValue) * 100));
            const isOverTarget = day.calories > targetCalories;

            return (
              <div
                key={day.date}
                onClick={() => onSelectDate(day.date)}
                className="flex flex-col items-center justify-end h-full cursor-pointer group"
                title={`${day.date}: ${day.calories} kcal`}
              >
                {/* Hover / Calorie Tooltip */}
                <span className="text-[10px] font-semibold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums mb-1">
                  {day.calories}
                </span>

                {/* Animated Glass Bar */}
                <div className="w-full max-w-[36px] bg-white/5 rounded-2xl p-0.5 h-[140px] flex items-end overflow-hidden border border-white/10 group-hover:border-orange-400/50 transition-all">
                  <div
                    className={`w-full rounded-xl transition-all duration-500 relative ${
                      day.isSelected
                        ? 'bg-gradient-to-t from-[#FF8C66] to-[#FF5E7E] shadow-[0_0_12px_rgba(255,140,102,0.6)]'
                        : isOverTarget
                        ? 'bg-gradient-to-t from-orange-500 to-rose-500 opacity-80'
                        : day.calories > 0
                        ? 'bg-gradient-to-t from-[#FFAE42]/80 to-[#FF8C66]/80 group-hover:opacity-100 opacity-70'
                        : 'bg-white/10'
                    }`}
                    style={{
                      height: `${Math.max(6, barHeightPct)}%`,
                    }}
                  >
                    {/* Top specular highlight on the bar */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-white/50 rounded-full" />
                  </div>
                </div>

                {/* Day of week & date */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs block font-bold transition-colors ${
                      day.isSelected ? 'text-orange-300' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                  <span className="text-[9px] text-slate-500 block tabular-nums">
                    {day.shortDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Average Weekly Macro Split */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#FFAE42]" />
            Rolling 7-Day Macro Split
          </span>
          <span className="text-[11px] text-slate-400">By Caloric Intake</span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex p-0.5 border border-white/10">
          <div
            style={{ width: `${pPct}%` }}
            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-l-full relative"
            title={`Protein: ${pPct}%`}
          />
          <div
            style={{ width: `${cPct}%` }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 relative"
            title={`Carbs: ${cPct}%`}
          />
          <div
            style={{ width: `${fPct}%` }}
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-r-full relative"
            title={`Fat: ${fPct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 mt-2 px-1 tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Protein: <strong className="text-white">{pPct}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Carbs: <strong className="text-white">{cPct}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Fat: <strong className="text-white">{fPct}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
