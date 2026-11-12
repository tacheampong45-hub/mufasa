import { DayLog, FoodItem, MealType, QuickAddFood, UserProfile } from '../types/nutrition';

const STORAGE_KEYS = {
  PROFILE: 'fuelly_user_profile_v1',
  LOGS: 'fuelly_day_logs_v1',
  QUICK_FOODS: 'fuelly_quick_foods_v1',
};

export const DEFAULT_PROFILE: UserProfile = {
  age: 28,
  gender: 'female',
  heightCm: 168,
  weightKg: 64,
  activityLevel: 'moderate',
  goal: 'maintain',
  unitPreference: 'metric',
  targets: {
    calories: 2050,
    protein: 130,
    carbs: 230,
    fat: 65,
    explanation: 'Balanced macro ratio optimized for steady daily energy and lean composition.',
  },
  isOnboarded: false,
};

const DEFAULT_QUICK_FOODS: QuickAddFood[] = [
  {
    id: 'qf-1',
    name: 'Avocado Toast & Poached Egg',
    portion: '1 slice + 1 egg',
    calories: 290,
    protein: 12,
    carbs: 24,
    fat: 16,
    mealType: 'breakfast',
    frequency: 8,
  },
  {
    id: 'qf-2',
    name: 'Greek Yogurt with Blueberries',
    portion: '1 cup (200g)',
    calories: 190,
    protein: 18,
    carbs: 22,
    fat: 4,
    mealType: 'breakfast',
    frequency: 6,
  },
  {
    id: 'qf-3',
    name: 'Grilled Chicken Salad',
    portion: '1 large bowl',
    calories: 420,
    protein: 42,
    carbs: 16,
    fat: 20,
    mealType: 'lunch',
    frequency: 7,
  },
  {
    id: 'qf-4',
    name: 'Whey Protein Shake',
    portion: '1 scoop with oat milk',
    calories: 210,
    protein: 26,
    carbs: 15,
    fat: 4,
    mealType: 'snacks',
    frequency: 9,
  },
  {
    id: 'qf-5',
    name: 'Salmon Fillet with Quinoa',
    portion: '150g salmon + 1/2 cup quinoa',
    calories: 520,
    protein: 38,
    carbs: 34,
    fat: 22,
    mealType: 'dinner',
    frequency: 5,
  },
  {
    id: 'qf-6',
    name: 'Handful of Raw Almonds',
    portion: '28g (approx 23 nuts)',
    calories: 165,
    protein: 6,
    carbs: 6,
    fat: 14,
    mealType: 'snacks',
    frequency: 4,
  },
];

export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading profile from localStorage:', err);
    return DEFAULT_PROFILE;
  }
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving profile to localStorage:', err);
  }
}

export function getStoredDayLog(date: string): DayLog {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    const logs: Record<string, DayLog> = raw ? JSON.parse(raw) : {};

    if (logs[date]) {
      return logs[date];
    }

    // Default empty log for the date
    return {
      date,
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    };
  } catch (err) {
    console.error('Error reading logs from localStorage:', err);
    return {
      date,
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    };
  }
}

export function saveStoredDayLog(log: DayLog): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    const logs: Record<string, DayLog> = raw ? JSON.parse(raw) : {};
    logs[log.date] = log;
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving day log to localStorage:', err);
  }
}

export function getPastWeekLogs(anchorDate: string): DayLog[] {
  const result: DayLog[] = [];
  const curr = new Date(anchorDate);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(curr);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    result.push(getStoredDayLog(iso));
  }

  return result;
}

export function getStoredQuickFoods(): QuickAddFood[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUICK_FOODS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUICK_FOODS, JSON.stringify(DEFAULT_QUICK_FOODS));
      return DEFAULT_QUICK_FOODS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error getting quick foods:', err);
    return DEFAULT_QUICK_FOODS;
  }
}

export function trackFoodUsage(items: FoodItem[], mealType: MealType): void {
  try {
    const current = getStoredQuickFoods();
    const updated = [...current];

    items.forEach((item) => {
      const existing = updated.find(
        (q) => q.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (existing) {
        existing.frequency += 1;
        existing.portion = item.portion;
        existing.calories = item.calories;
        existing.protein = item.protein;
        existing.carbs = item.carbs;
        existing.fat = item.fat;
      } else {
        updated.push({
          id: `qf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name,
          portion: item.portion,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          mealType,
          frequency: 1,
        });
      }
    });

    // Sort by frequency and keep top 12
    updated.sort((a, b) => b.frequency - a.frequency);
    const trimmed = updated.slice(0, 12);
    localStorage.setItem(STORAGE_KEYS.QUICK_FOODS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error tracking food usage:', err);
  }
}

// Conversions
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462);
}

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, in: inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatReadableDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
