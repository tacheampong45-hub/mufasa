export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: {
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
    snacks: FoodItem[];
  };
  aiInsight?: {
    summary: string;
    suggestion: string;
    generatedAt: string;
  };
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  explanation: string;
}

export interface UserProfile {
  age: number;
  gender: 'female' | 'male' | 'other';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  unitPreference: 'metric' | 'imperial';
  targets: NutritionTargets;
  isOnboarded: boolean;
}

export interface QuickAddFood {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  frequency: number;
}
