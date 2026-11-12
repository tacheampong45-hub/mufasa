import React from 'react';
import { ChevronLeft, ChevronRight, Flame, Sliders, Calendar } from 'lucide-react';
import { formatReadableDate, getTodayIso } from '../utils/storage';

interface TopNavProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  unitPreference: 'metric' | 'imperial';
  onToggleUnits: () => void;
  onOpenSettings: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentDate,
  onDateChange,
  unitPreference,
  onToggleUnits,
  onOpenSettings,
}) => {
  const todayIso = getTodayIso();
  const isToday = currentDate === todayIso;

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleJumpToday = () => {
    onDateChange(todayIso);
  };

  return (
    <header className="sticky top-3 z-30 w-full max-w-5xl mx-auto px-4 mb-6">
      <div className="glass-panel rounded-3xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-xl">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF8C66] to-[#FF5E7E] flex items-center justify-center shadow-lg shadow-orange-500/20 border border-white/30">
            <Flame className="w-5 h-5 text-white fill-white/30 drop-shadow" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Fuelly
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-orange-200 border border-white/10">
              AI
            </span>
          </span>
        </div>

        {/* Date Selector Zone */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
          <button
            onClick={handlePrevDay}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2.5 py-1 text-center min-w-[100px]">
            <span className="text-xs font-semibold text-white block">
              {formatReadableDate(currentDate)}
            </span>
            <span className="text-[10px] text-slate-400 block tabular-nums">
              {currentDate}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={handleJumpToday}
              className="ml-1 text-[11px] font-medium px-2 py-1 rounded-xl bg-[#FF8C66]/20 text-[#FFAE88] hover:bg-[#FF8C66]/30 transition-all border border-[#FF8C66]/30"
            >
              Today
            </button>
          )}
        </div>

        {/* Actions Zone */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Unit Toggle Button */}
          <button
            onClick={onToggleUnits}
            className="glass-button-secondary text-xs font-semibold px-3 py-1.5 rounded-2xl text-slate-200 flex items-center gap-1.5"
            title="Toggle measurement units"
          >
            <span className="text-[10px] uppercase text-slate-400">Units:</span>
            <span className="text-orange-300 uppercase">{unitPreference}</span>
          </button>

          {/* Profile & Target Adjuster Button */}
          <button
            onClick={onOpenSettings}
            className="glass-button-secondary w-9 h-9 rounded-2xl flex items-center justify-center text-slate-200 hover:text-white"
            title="Adjust targets & profile"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
