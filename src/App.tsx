/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GlassBackground } from './components/GlassBackground';
import { TopNav } from './components/TopNav';
import { CalorieRing } from './components/CalorieRing';
import { MacroBars } from './components/MacroBars';
import { FoodInputBar } from './components/FoodInputBar';
import { MealSection } from './components/MealSection';
import { AiInsightsCard } from './components/AiInsightsCard';
import { WeeklyTrends } from './components/WeeklyTrends';
import { FoodConfirmModal } from './components/FoodConfirmModal';
import { OnboardingModal } from './components/OnboardingModal';
import { DayLog, FoodItem, MealType, QuickAddFood, UserProfile } from './types/nutrition';
import {
  getStoredProfile,
  saveStoredProfile,
  getStoredDayLog,
  saveStoredDayLog,
  getPastWeekLogs,
  getStoredQuickFoods,
  trackFoodUsage,
  getTodayIso,
} from './utils/storage';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!profile.isOnboarded);
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayIso());
  const [dayLog, setDayLog] = useState<DayLog>(() => getStoredDayLog(getTodayIso()));
  const [weekLogs, setWeekLogs] = useState<DayLog[]>(() => getPastWeekLogs(getTodayIso()));
  const [quickFoods, setQuickFoods] = useState<QuickAddFood[]>(() => getStoredQuickFoods());

  // Natural language parsing state
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Meal confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    items: Omit<FoodItem, 'id'>[];
    mealType: MealType;
    notice?: string | null;
    isFallback?: boolean;
  }>({
    isOpen: false,
    items: [],
    mealType: 'breakfast',
    notice: null,
    isFallback: false,
  });

  // AI insights loading state
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);

  // Sync day log whenever date changes
  useEffect(() => {
    const log = getStoredDayLog(currentDate);
    setDayLog(log);
    setWeekLogs(getPastWeekLogs(currentDate));
  }, [currentDate]);

  // Compute daily totals
  const dailyTotals = useMemo(() => {
    const allItems: FoodItem[] = [
      ...dayLog.meals.breakfast,
      ...dayLog.meals.lunch,
      ...dayLog.meals.dinner,
      ...dayLog.meals.snacks,
    ];

    return {
      calories: allItems.reduce((acc, it) => acc + (it.calories || 0), 0),
      protein: allItems.reduce((acc, it) => acc + (it.protein || 0), 0),
      carbs: allItems.reduce((acc, it) => acc + (it.carbs || 0), 0),
      fat: allItems.reduce((acc, it) => acc + (it.fat || 0), 0),
      itemCount: allItems.length,
    };
  }, [dayLog]);

  // Unit toggle handler
  const handleToggleUnits = () => {
    const newUnit = profile.unitPreference === 'metric' ? 'imperial' : 'metric';
    const updated: UserProfile = { ...profile, unitPreference: newUnit };
    setProfile(updated);
    saveStoredProfile(updated);
  };

  // Profile save from onboarding or settings
  const handleSaveProfile = (updated: UserProfile) => {
    setProfile(updated);
    saveStoredProfile(updated);
    setShowOnboarding(false);
  };

  // Natural language meal breakdown call to server Gemini endpoint
  const handleParseFoodText = async (text: string, mealType: MealType) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mealType }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze food description');
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('No individual items could be identified. Please try with more details.');
      }

      // Open confirmation modal with parsed items
      setConfirmModal({
        isOpen: true,
        items: data.items,
        mealType,
        notice: data.notice || null,
        isFallback: data.source === 'smart_fallback',
      });
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Something went wrong while analyzing your food. Please retry.');
    } finally {
      setIsParsing(false);
    }
  };

  // 1-tap quick add from chips
  const handleDirectAddFood = (food: QuickAddFood) => {
    const newItem: FoodItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: food.name,
      portion: food.portion,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };

    const updatedLog: DayLog = {
      ...dayLog,
      meals: {
        ...dayLog.meals,
        [food.mealType]: [...dayLog.meals[food.mealType], newItem],
      },
    };

    setDayLog(updatedLog);
    saveStoredDayLog(updatedLog);
    setWeekLogs(getPastWeekLogs(currentDate));

    trackFoodUsage([newItem], food.mealType);
    setQuickFoods(getStoredQuickFoods());
  };

  // Confirm and log items from modal
  const handleConfirmMeal = (items: FoodItem[], targetMeal: MealType) => {
    const updatedLog: DayLog = {
      ...dayLog,
      meals: {
        ...dayLog.meals,
        [targetMeal]: [...dayLog.meals[targetMeal], ...items],
      },
    };

    setDayLog(updatedLog);
    saveStoredDayLog(updatedLog);
    setWeekLogs(getPastWeekLogs(currentDate));

    trackFoodUsage(items, targetMeal);
    setQuickFoods(getStoredQuickFoods());

    setConfirmModal({ isOpen: false, items: [], mealType: 'breakfast' });
  };

  // Delete food item from specific meal
  const handleRemoveItem = (mealType: MealType, itemId: string) => {
    const updatedLog: DayLog = {
      ...dayLog,
      meals: {
        ...dayLog.meals,
        [mealType]: dayLog.meals[mealType].filter((it) => it.id !== itemId),
      },
    };

    setDayLog(updatedLog);
    saveStoredDayLog(updatedLog);
    setWeekLogs(getPastWeekLogs(currentDate));
  };

  // Generate Daily AI Insights with Gemini
  const handleGenerateInsights = useCallback(async () => {
    setIsGeneratingInsights(true);

    try {
      // Build meal summary string
      const summaryParts: string[] = [];
      (['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).forEach((m) => {
        if (dayLog.meals[m].length > 0) {
          const names = dayLog.meals[m].map((i) => i.name).join(', ');
          summaryParts.push(`${m.toUpperCase()}: ${names}`);
        }
      });

      const response = await fetch('/api/daily-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totals: dailyTotals,
          targets: profile.targets,
          mealsDescription: summaryParts.join(' | ') || 'No meals logged yet today',
          goal: profile.goal,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      const updatedLog: DayLog = {
        ...dayLog,
        aiInsight: {
          summary: data.summary,
          suggestion: data.suggestion,
          generatedAt: new Date().toISOString(),
        },
      };

      setDayLog(updatedLog);
      saveStoredDayLog(updatedLog);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [dailyTotals, dayLog, profile.targets, profile.goal]);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col selection:bg-orange-500/30 selection:text-white">
      {/* Dynamic Liquid Glass Background with ambient floating blobs */}
      <GlassBackground />

      {/* Top Floating Glass App Bar */}
      <TopNav
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        unitPreference={profile.unitPreference}
        onToggleUnits={handleToggleUnits}
        onOpenSettings={() => setShowOnboarding(true)}
      />

      {/* Main Content Dashboard */}
      <main className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-6 flex-1">
        {/* Top Metric Section: Calorie Ring + Macros & AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Animated Calorie Ring (Left 5 Columns) */}
          <div className="md:col-span-5 flex flex-col">
            <CalorieRing
              consumed={dailyTotals.calories}
              target={profile.targets.calories}
              goal={profile.goal}
            />
          </div>

          {/* Macro Bars & Nutrition Coach Card (Right 7 Columns) */}
          <div className="md:col-span-7 flex flex-col justify-between gap-5">
            <MacroBars
              totals={{
                protein: dailyTotals.protein,
                carbs: dailyTotals.carbs,
                fat: dailyTotals.fat,
              }}
              targets={{
                protein: profile.targets.protein,
                carbs: profile.targets.carbs,
                fat: profile.targets.fat,
              }}
            />

            <AiInsightsCard
              insight={dayLog.aiInsight}
              onGenerateInsights={handleGenerateInsights}
              isLoading={isGeneratingInsights}
              caloriesRemaining={Math.max(0, profile.targets.calories - dailyTotals.calories)}
            />
          </div>
        </div>

        {/* Natural Language Meal Input Bar + Quick Add Chips */}
        <FoodInputBar
          quickFoods={quickFoods}
          onDirectAddFood={handleDirectAddFood}
          onParseFoodText={handleParseFoodText}
          isLoading={isParsing}
          error={parseError}
          onClearError={() => setParseError(null)}
        />

        {/* Day's Meals Sections (Breakfast, Lunch, Dinner, Snacks) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Day's Logged Meals
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">
              {dailyTotals.itemCount} {dailyTotals.itemCount === 1 ? 'item' : 'items'} ·{' '}
              <strong className="text-orange-200">{dailyTotals.calories} kcal</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MealSection
              mealType="breakfast"
              items={dayLog.meals.breakfast}
              onRemoveItem={handleRemoveItem}
              onQuickAddTrigger={(m) => {
                setConfirmModal({
                  isOpen: true,
                  items: [
                    {
                      name: 'Oatmeal with Berries',
                      portion: '1 bowl (250g)',
                      calories: 280,
                      protein: 9,
                      carbs: 48,
                      fat: 5,
                    },
                  ],
                  mealType: m,
                });
              }}
            />

            <MealSection
              mealType="lunch"
              items={dayLog.meals.lunch}
              onRemoveItem={handleRemoveItem}
              onQuickAddTrigger={(m) => {
                setConfirmModal({
                  isOpen: true,
                  items: [
                    {
                      name: 'Turkey Avocado Wrap',
                      portion: '1 wrap',
                      calories: 460,
                      protein: 34,
                      carbs: 42,
                      fat: 16,
                    },
                  ],
                  mealType: m,
                });
              }}
            />

            <MealSection
              mealType="dinner"
              items={dayLog.meals.dinner}
              onRemoveItem={handleRemoveItem}
              onQuickAddTrigger={(m) => {
                setConfirmModal({
                  isOpen: true,
                  items: [
                    {
                      name: 'Grilled Steak with Sweet Potato',
                      portion: '1 plate (200g steak)',
                      calories: 590,
                      protein: 48,
                      carbs: 38,
                      fat: 24,
                    },
                  ],
                  mealType: m,
                });
              }}
            />

            <MealSection
              mealType="snacks"
              items={dayLog.meals.snacks}
              onRemoveItem={handleRemoveItem}
              onQuickAddTrigger={(m) => {
                setConfirmModal({
                  isOpen: true,
                  items: [
                    {
                      name: 'Apple with Peanut Butter',
                      portion: '1 medium apple + 2 tbsp PB',
                      calories: 270,
                      protein: 7,
                      carbs: 30,
                      fat: 16,
                    },
                  ],
                  mealType: m,
                });
              }}
            />
          </div>
        </div>

        {/* Weekly View & Rolling Macro Split */}
        <WeeklyTrends
          logs={weekLogs}
          targetCalories={profile.targets.calories}
          currentDate={currentDate}
          onSelectDate={setCurrentDate}
        />
      </main>

      {/* Food Confirmation & Item Editing Modal */}
      <FoodConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        initialItems={confirmModal.items}
        selectedMeal={confirmModal.mealType}
        onConfirm={handleConfirmMeal}
        notice={confirmModal.notice}
        isFallback={confirmModal.isFallback}
      />

      {/* Onboarding & Profile Adjustment Glass Flow */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        currentProfile={profile}
        onSaveProfile={handleSaveProfile}
        isFirstLaunch={!profile.isOnboarded}
      />
    </div>
  );
}
