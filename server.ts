import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get or lazily initialize Gemini client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback Targets Calculation
function calculateFallbackTargets(
  age: number,
  gender: string,
  heightCm: number,
  weightKg: number,
  activityLevel: string,
  goal: string
) {
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  let targetCalories = tdee;
  let explanation = '';

  if (goal === 'lose') {
    targetCalories = Math.max(1200, Math.round(tdee - 450));
    explanation = `Calibrated to a safe 450 kcal deficit below your maintenance level (~${tdee} kcal) to encourage steady fat loss while preserving lean mass.`;
  } else if (goal === 'gain') {
    targetCalories = Math.round(tdee + 350);
    explanation = `Calibrated to a 350 kcal surplus above your maintenance level (~${tdee} kcal) to support lean muscle hypertrophy and athletic recovery.`;
  } else {
    targetCalories = tdee;
    explanation = `Calibrated directly to your total daily energy expenditure (~${tdee} kcal) to sustain stable energy and body composition.`;
  }

  const proteinGrams = Math.round(weightKg * (goal === 'gain' ? 2.0 : 1.8));
  const fatGrams = Math.round((targetCalories * 0.25) / 9);
  const carbCalories = Math.max(0, targetCalories - (proteinGrams * 4 + fatGrams * 9));
  const carbGrams = Math.round(carbCalories / 4);

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
    explanation,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

// Multi-model Gemini fallback chain to handle 503 high demand / rate limit spikes gracefully
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function callGeminiWithFallback(
  ai: GoogleGenAI,
  makeParams: (model: string) => Parameters<typeof ai.models.generateContent>[0]
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const params = makeParams(model);
        const response = await withTimeout(
          ai.models.generateContent(params),
          6000,
          `Model '${model}' request timed out after 6000ms`
        );
        return { text: response.text || '', modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || String(err)).toLowerCase();
        const isTransient =
          msg.includes('503') ||
          msg.includes('unavailable') ||
          msg.includes('high demand') ||
          msg.includes('spikes in demand') ||
          msg.includes('429') ||
          msg.includes('resource_exhausted') ||
          msg.includes('timed out') ||
          msg.includes('timeout') ||
          msg.includes('fetch failed');

        if (isTransient && attempt === 1) {
          // Wait 300ms before retrying on the same model
          await new Promise((res) => setTimeout(res, 300));
          continue;
        }

        // Log soft warning and try next model in the fallback chain
        console.warn(`[Gemini API] Model '${model}' attempt ${attempt} temporary issue (${msg.slice(0, 80)}...). Trying fallback model...`);
        break;
      }
    }
  }

  throw lastError;
}

// Comprehensive Nutritional Knowledge Base for offline & high-demand fallback
interface NutritionItemDef {
  name: string;
  defaultPortion: string;
  unitWeightG?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const FOOD_DATABASE: Record<string, NutritionItemDef> = {
  // Eggs & Breakfast Proteins
  'egg': { name: 'Large Egg', defaultPortion: '1 large egg', calories: 74, protein: 6, carbs: 0.5, fat: 5 },
  'poached egg': { name: 'Poached Egg', defaultPortion: '1 large egg', calories: 72, protein: 6, carbs: 0.5, fat: 5 },
  'fried egg': { name: 'Fried Egg', defaultPortion: '1 large egg', calories: 90, protein: 6, carbs: 0.5, fat: 7 },
  'scrambled egg': { name: 'Scrambled Eggs', defaultPortion: '1 large egg', calories: 95, protein: 6, carbs: 1, fat: 7 },
  'egg white': { name: 'Egg Whites', defaultPortion: '3 egg whites (100g)', calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  'bacon': { name: 'Crispy Bacon', defaultPortion: '2 strips (30g)', calories: 110, protein: 7, carbs: 0.5, fat: 9 },
  'sausage': { name: 'Breakfast Sausage', defaultPortion: '1 link (45g)', calories: 150, protein: 7, carbs: 1, fat: 13 },
  'ham': { name: 'Sliced Deli Ham', defaultPortion: '2 slices (50g)', calories: 60, protein: 10, carbs: 1, fat: 1.5 },

  // Breads, Bagels & Toast
  'toast': { name: 'Toasted Bread', defaultPortion: '1 slice (38g)', calories: 85, protein: 3, carbs: 15, fat: 1 },
  'sourdough': { name: 'Sourdough Toast', defaultPortion: '1 thick slice (45g)', calories: 95, protein: 4, carbs: 19, fat: 0.5 },
  'bagel': { name: 'Plain Bagel', defaultPortion: '1 bagel (90g)', calories: 260, protein: 10, carbs: 50, fat: 1.5 },
  'croissant': { name: 'Butter Croissant', defaultPortion: '1 croissant (65g)', calories: 270, protein: 5, carbs: 29, fat: 15 },
  'pita': { name: 'Pita Bread', defaultPortion: '1 pita (60g)', calories: 165, protein: 5.5, carbs: 33, fat: 1 },
  'tortilla': { name: 'Flour Tortilla', defaultPortion: '1 medium (45g)', calories: 140, protein: 3.5, carbs: 24, fat: 3.5 },
  'english muffin': { name: 'English Muffin', defaultPortion: '1 muffin (57g)', calories: 130, protein: 4.5, carbs: 26, fat: 1 },

  // Spreads & Healthy Fats
  'avocado': { name: 'Fresh Avocado', defaultPortion: '1/2 medium avocado (75g)', calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  'butter': { name: 'Salted Butter', defaultPortion: '1 pat / tbsp (14g)', calories: 102, protein: 0.1, carbs: 0, fat: 11.5 },
  'peanut butter': { name: 'Natural Peanut Butter', defaultPortion: '2 tbsp (32g)', calories: 190, protein: 8, carbs: 7, fat: 16 },
  'almond butter': { name: 'Almond Butter', defaultPortion: '2 tbsp (32g)', calories: 196, protein: 7, carbs: 6, fat: 18 },
  'cream cheese': { name: 'Cream Cheese', defaultPortion: '2 tbsp (30g)', calories: 100, protein: 2, carbs: 2, fat: 10 },
  'hummus': { name: 'Classic Hummus', defaultPortion: '2 tbsp (30g)', calories: 70, protein: 2.5, carbs: 5, fat: 5 },
  'honey': { name: 'Raw Honey', defaultPortion: '1 tbsp (21g)', calories: 64, protein: 0, carbs: 17, fat: 0 },
  'jam': { name: 'Fruit Jam / Preserves', defaultPortion: '1 tbsp (20g)', calories: 50, protein: 0, carbs: 13, fat: 0 },
  'olive oil': { name: 'Extra Virgin Olive Oil', defaultPortion: '1 tbsp (14ml)', calories: 120, protein: 0, carbs: 0, fat: 14 },

  // Meats & Poultry
  'chicken': { name: 'Grilled Chicken Breast', defaultPortion: '150g cooked', calories: 245, protein: 46, carbs: 0, fat: 5 },
  'chicken breast': { name: 'Grilled Chicken Breast', defaultPortion: '150g cooked', calories: 245, protein: 46, carbs: 0, fat: 5 },
  'chicken thigh': { name: 'Roasted Chicken Thigh', defaultPortion: '1 thigh (100g cooked)', calories: 210, protein: 24, carbs: 0, fat: 12 },
  'turkey': { name: 'Roasted Turkey Breast', defaultPortion: '140g cooked', calories: 190, protein: 40, carbs: 0, fat: 2 },
  'steak': { name: 'Lean Beef Sirloin Steak', defaultPortion: '180g cooked', calories: 360, protein: 45, carbs: 0, fat: 18 },
  'beef': { name: 'Lean Ground Beef (90/10)', defaultPortion: '150g cooked', calories: 290, protein: 38, carbs: 0, fat: 14 },
  'burger': { name: 'Beef Burger Patty', defaultPortion: '1 patty (120g)', calories: 280, protein: 28, carbs: 0, fat: 18 },
  'pork': { name: 'Pork Tenderloin', defaultPortion: '150g cooked', calories: 215, protein: 39, carbs: 0, fat: 5.5 },

  // Seafood
  'salmon': { name: 'Pan-Seared Salmon Fillet', defaultPortion: '160g cooked', calories: 340, protein: 34, carbs: 0, fat: 21 },
  'tuna': { name: 'Canned Albacore Tuna', defaultPortion: '1 can (130g drained)', calories: 150, protein: 32, carbs: 0, fat: 1.5 },
  'shrimp': { name: 'Steamed / Grilled Shrimp', defaultPortion: '120g cooked', calories: 120, protein: 26, carbs: 1, fat: 1.5 },
  'fish': { name: 'White Fish Fillet (Cod/Tilapia)', defaultPortion: '150g cooked', calories: 160, protein: 34, carbs: 0, fat: 2 },

  // Grains, Rice, Pasta & Potatoes
  'rice': { name: 'Cooked Jasmine White Rice', defaultPortion: '1 cup (160g)', calories: 210, protein: 4.5, carbs: 45, fat: 0.5 },
  'brown rice': { name: 'Cooked Brown Rice', defaultPortion: '1 cup (195g)', calories: 215, protein: 5, carbs: 45, fat: 1.8 },
  'quinoa': { name: 'Cooked Quinoa', defaultPortion: '1 cup (185g)', calories: 220, protein: 8, carbs: 39, fat: 3.5 },
  'pasta': { name: 'Cooked Pasta', defaultPortion: '1.5 cups (200g)', calories: 290, protein: 10, carbs: 58, fat: 1.5 },
  'oat': { name: 'Rolled Oatmeal', defaultPortion: '1 bowl (40g dry oats)', calories: 160, protein: 6, carbs: 28, fat: 3 },
  'oatmeal': { name: 'Rolled Oatmeal', defaultPortion: '1 bowl (40g dry oats)', calories: 160, protein: 6, carbs: 28, fat: 3 },
  'granola': { name: 'Crunchy Oat Granola', defaultPortion: '1/2 cup (50g)', calories: 220, protein: 5, carbs: 32, fat: 9 },
  'sweet potato': { name: 'Baked Sweet Potato', defaultPortion: '1 medium (150g)', calories: 130, protein: 2.5, carbs: 30, fat: 0.2 },
  'potato': { name: 'Baked Potato', defaultPortion: '1 medium (170g)', calories: 160, protein: 4, carbs: 37, fat: 0.2 },
  'french fries': { name: 'Crispy French Fries', defaultPortion: '1 medium serving (115g)', calories: 340, protein: 4, carbs: 44, fat: 16 },
  'beans': { name: 'Cooked Black Beans', defaultPortion: '1/2 cup (130g)', calories: 115, protein: 7.5, carbs: 20, fat: 0.5 },
  'tofu': { name: 'Firm Tofu', defaultPortion: '150g', calories: 130, protein: 15, carbs: 3, fat: 8 },

  // Dairy & Plant Alternatives
  'milk': { name: 'Whole Cow Milk', defaultPortion: '1 cup (240ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  'oat milk': { name: 'Creamy Oat Milk', defaultPortion: '1 cup (240ml)', calories: 120, protein: 3, carbs: 16, fat: 5 },
  'almond milk': { name: 'Unsweetened Almond Milk', defaultPortion: '1 cup (240ml)', calories: 35, protein: 1, carbs: 1, fat: 2.5 },
  'yogurt': { name: 'Plain Greek Yogurt (0-2%)', defaultPortion: '3/4 cup (170g)', calories: 130, protein: 18, carbs: 6, fat: 2 },
  'greek yogurt': { name: 'Plain Greek Yogurt (0-2%)', defaultPortion: '3/4 cup (170g)', calories: 130, protein: 18, carbs: 6, fat: 2 },
  'cheese': { name: 'Cheddar Cheese', defaultPortion: '1 oz slice (28g)', calories: 115, protein: 7, carbs: 0.5, fat: 9.5 },
  'mozzarella': { name: 'Fresh Mozzarella', defaultPortion: '1 oz (28g)', calories: 85, protein: 6, carbs: 1, fat: 6 },
  'cottage cheese': { name: 'Low Fat Cottage Cheese', defaultPortion: '1/2 cup (115g)', calories: 90, protein: 14, carbs: 4, fat: 1.5 },

  // Fruits
  'banana': { name: 'Fresh Banana', defaultPortion: '1 medium (118g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
  'apple': { name: 'Crisp Apple', defaultPortion: '1 medium (180g)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  'berries': { name: 'Mixed Fresh Berries', defaultPortion: '1 cup (150g)', calories: 70, protein: 1.5, carbs: 16, fat: 0.5 },
  'blueberries': { name: 'Fresh Blueberries', defaultPortion: '1 cup (148g)', calories: 84, protein: 1, carbs: 21, fat: 0.5 },
  'strawberries': { name: 'Fresh Strawberries', defaultPortion: '1 cup (150g)', calories: 48, protein: 1, carbs: 11, fat: 0.5 },
  'orange': { name: 'Navel Orange', defaultPortion: '1 medium (130g)', calories: 65, protein: 1.2, carbs: 16, fat: 0.2 },

  // Vegetables & Salads
  'salad': { name: 'Garden Salad with Vinaigrette', defaultPortion: '1 bowl (150g)', calories: 110, protein: 2, carbs: 8, fat: 8 },
  'broccoli': { name: 'Steamed Broccoli', defaultPortion: '1 cup (90g)', calories: 35, protein: 2.5, carbs: 6, fat: 0.4 },
  'spinach': { name: 'Baby Spinach', defaultPortion: '2 cups raw / 1 cup cooked', calories: 25, protein: 3, carbs: 4, fat: 0.4 },
  'vegetables': { name: 'Mixed Roasted Vegetables', defaultPortion: '1.5 cups (150g)', calories: 90, protein: 2.5, carbs: 14, fat: 3 },

  // Beverages & Shakes
  'coffee': { name: 'Black Coffee', defaultPortion: '1 mug (240ml)', calories: 4, protein: 0.3, carbs: 0, fat: 0 },
  'espresso': { name: 'Double Espresso', defaultPortion: '2 shots (60ml)', calories: 5, protein: 0.4, carbs: 0.8, fat: 0.1 },
  'latte': { name: 'Caffè Latte with Whole Milk', defaultPortion: '1 cup (300ml)', calories: 160, protein: 9, carbs: 14, fat: 7 },
  'cappuccino': { name: 'Cappuccino', defaultPortion: '1 cup (240ml)', calories: 120, protein: 7, carbs: 10, fat: 5 },
  'matcha': { name: 'Iced Matcha Green Tea Latte', defaultPortion: '1 tall cup (350ml)', calories: 180, protein: 6, carbs: 26, fat: 5 },
  'tea': { name: 'Brewed Herbal / Green Tea', defaultPortion: '1 mug (240ml)', calories: 2, protein: 0, carbs: 0.5, fat: 0 },
  'protein shake': { name: 'Whey Protein Shake', defaultPortion: '1 scoop (30g) in water', calories: 130, protein: 25, carbs: 3, fat: 1.5 },
  'smoothie': { name: 'Fruit & Yogurt Smoothie', defaultPortion: '1 tall glass (350ml)', calories: 250, protein: 8, carbs: 48, fat: 3 },
  'orange juice': { name: 'Fresh Orange Juice', defaultPortion: '1 glass (240ml)', calories: 110, protein: 1.8, carbs: 26, fat: 0.5 },

  // Popular Prepared Meals & Snacks
  'pizza': { name: 'Pepperoni Pizza Slice', defaultPortion: '1 standard slice (105g)', calories: 290, protein: 12, carbs: 32, fat: 12 },
  'burrito': { name: 'Chicken Burrito with Rice & Beans', defaultPortion: '1 burrito (350g)', calories: 680, protein: 38, carbs: 75, fat: 22 },
  'sandwich': { name: 'Deli Turkey & Cheese Sandwich', defaultPortion: '1 sandwich', calories: 420, protein: 28, carbs: 42, fat: 14 },
  'wrap': { name: 'Grilled Chicken Caesar Wrap', defaultPortion: '1 wrap', calories: 460, protein: 32, carbs: 40, fat: 18 },
  'protein bar': { name: 'Chocolate Whey Protein Bar', defaultPortion: '1 bar (60g)', calories: 210, protein: 20, carbs: 22, fat: 7 },
  'almonds': { name: 'Roasted Almonds', defaultPortion: '1 handful (28g / ~23 nuts)', calories: 165, protein: 6, carbs: 6, fat: 14 },
  'chocolate': { name: '70% Dark Chocolate', defaultPortion: '3 squares (30g)', calories: 170, protein: 2.2, carbs: 14, fat: 12 },
};

// Natural language quantity parsing helper
function extractQuantityMultiplier(rawStr: string): { multiplier: number; cleanText: string } {
  let text = rawStr.trim();
  let multiplier = 1;

  // Check word numbers
  const wordNumberMap: Record<string, number> = {
    'a': 1,
    'an': 1,
    'one': 1,
    'single': 1,
    'two': 2,
    'double': 2,
    'three': 3,
    'triple': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'half': 0.5,
    'half a': 0.5,
    '1/2': 0.5,
    'quarter': 0.25,
    '1/4': 0.25,
  };

  // Match digit prefixes like "2 eggs", "2.5 scoops", "200g chicken"
  const digitGramMatch = text.match(/^(\d+(\.\d+)?)\s*(g|grams)\b\s*(.*)/i);
  if (digitGramMatch) {
    const grams = parseFloat(digitGramMatch[1]);
    return { multiplier: grams / 100, cleanText: digitGramMatch[4] || digitGramMatch[1] + 'g' };
  }

  const digitPrefixMatch = text.match(/^(\d+(\.\d+)?)\s*(slices?|pieces?|cups?|tbsps?|tsps?|scoops?|bowls?|strips?|cans?|bottles?)?\s+(.*)/i);
  if (digitPrefixMatch) {
    multiplier = parseFloat(digitPrefixMatch[1]);
    const remainder = digitPrefixMatch[4] || '';
    return { multiplier: Math.max(0.2, multiplier), cleanText: remainder };
  }

  // Check word numbers
  for (const [word, val] of Object.entries(wordNumberMap)) {
    const regex = new RegExp(`^${word}\\s+(slices?|pieces?|cups?|tbsps?|scoops?|bowls?|strips?)?\\s*(.*)`, 'i');
    const match = text.match(regex);
    if (match) {
      return { multiplier: val, cleanText: match[2] || text };
    }
  }

  return { multiplier: 1, cleanText: text };
}

// Smart heuristic food parser fallback
function parseFallbackFoodItems(text: string) {
  // Split on commas, semicolons, +, & and conjunctions like 'and', 'with', 'plus', 'along with'
  const rawParts = text
    .split(/,|\;|\+|\&|\band\b|\bwith\b|\bplus\b|\balong with\b|\bas well as\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (rawParts.length === 0) {
    return [
      {
        name: 'Meal Portion',
        portion: '1 standard serving',
        calories: 320,
        protein: 18,
        carbs: 35,
        fat: 10,
      },
    ];
  }

  return rawParts.map((rawPart) => {
    const { multiplier, cleanText } = extractQuantityMultiplier(rawPart);
    const lower = cleanText.toLowerCase();

    // Look for best match in FOOD_DATABASE (match longest keys first)
    const sortedKeys = Object.keys(FOOD_DATABASE).sort((a, b) => b.length - a.length);
    let matchedItem: NutritionItemDef | null = null;

    for (const key of sortedKeys) {
      if (lower.includes(key)) {
        matchedItem = FOOD_DATABASE[key];
        break;
      }
    }

    if (matchedItem) {
      const mult = multiplier;
      const calories = Math.round(matchedItem.calories * mult);
      const protein = Math.round(matchedItem.protein * mult * 10) / 10;
      const carbs = Math.round(matchedItem.carbs * mult * 10) / 10;
      const fat = Math.round(matchedItem.fat * mult * 10) / 10;

      let portionStr = matchedItem.defaultPortion;
      if (mult !== 1) {
        portionStr = `${mult}x ${matchedItem.defaultPortion}`;
      }

      // Title case format name
      const displayName = mult > 1 && !matchedItem.name.endsWith('s')
        ? `${mult} ${matchedItem.name}s`
        : mult !== 1
        ? `${mult}x ${matchedItem.name}`
        : matchedItem.name;

      return {
        name: displayName,
        portion: portionStr,
        calories,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      };
    }

    // Default clean estimate for unmapped food names
    const capitalizedName = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    const calories = Math.round(220 * multiplier);
    const protein = Math.round(12 * multiplier);
    const carbs = Math.round(26 * multiplier);
    const fat = Math.round(7 * multiplier);

    return {
      name: capitalizedName.slice(0, 45) || 'Food Item',
      portion: multiplier === 1 ? '1 standard serving' : `${multiplier} servings`,
      calories,
      protein,
      carbs,
      fat,
    };
  });
}

// 1. Calculate Targets
app.post('/api/calculate-targets', async (req, res) => {
  const { age, gender, heightCm, weightKg, activityLevel, goal } = req.body;
  const fallback = calculateFallbackTargets(
    Number(age) || 28,
    gender || 'other',
    Number(heightCm) || 172,
    Number(weightKg) || 70,
    activityLevel || 'moderate',
    goal || 'maintain'
  );

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json(fallback);
    }

    const prompt = `You are a clinical sports nutritionist. Calculate optimal daily calorie and macronutrient targets based on:
Age: ${age}
Gender: ${gender}
Height: ${heightCm} cm
Weight: ${weightKg} kg
Activity Level: ${activityLevel}
Goal: ${goal} (lose weight, maintain, or gain muscle)

Calculate scientifically:
1. Daily calories (reasonable surplus or deficit if goal is gain/lose)
2. Daily protein (in grams)
3. Daily carbohydrates (in grams)
4. Daily dietary fats (in grams)
5. A concise, encouraging explanation (1-2 sentences) of why this macro split works for their specific body and goal.`;

    const { text } = await callGeminiWithFallback(ai, (model) => ({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.INTEGER, description: 'Total daily calories target' },
            protein: { type: Type.INTEGER, description: 'Target daily protein in grams' },
            carbs: { type: Type.INTEGER, description: 'Target daily carbohydrates in grams' },
            fat: { type: Type.INTEGER, description: 'Target daily fat in grams' },
            explanation: { type: Type.STRING, description: '1-2 sentence warm explanation' },
          },
          required: ['calories', 'protein', 'carbs', 'fat', 'explanation'],
        },
      },
    }));

    const parsed = JSON.parse(text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini target calculation fell back to sports science formula:', (error as any)?.message?.slice(0, 80));
    return res.json(fallback);
  }
});

// 2. Parse Natural Language Food Log
app.post('/api/parse-food', async (req, res) => {
  const { text, mealType } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a description of what you ate.' });
  }

  try {
    const ai = getGenAI();
    if (!ai) {
      const fallbackItems = parseFallbackFoodItems(text);
      return res.json({
        items: fallbackItems,
        source: 'smart_fallback',
        notice: 'Estimated via Smart Nutrition Engine',
      });
    }

    const prompt = `You are a nutrition assistant. Break down the user's natural language meal description into individual food items with realistic estimated portions, calories, and macros (protein, carbs, and fat in grams).
Meal Type context: ${mealType || 'meal'}
User description: "${text}"

Rules:
- Separate multi-item meals into distinct items (e.g. "two eggs, a slice of buttered toast, and a black coffee" -> 3 items: "Poached/Fried Eggs", "Sourdough Toast with Butter", "Black Coffee").
- Include estimated portion size string for each item (e.g. "2 large eggs", "1 slice (45g)", "1 cup (240ml)").
- Accurate calorie and macro calculations: protein (4 cal/g), carbs (4 cal/g), fat (9 cal/g).
- Always return realistic integers for calories, protein, carbs, and fat.`;

    const { text: resultText, modelUsed } = await callGeminiWithFallback(ai, (model) => ({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Name of the individual food item' },
                  portion: { type: Type.STRING, description: 'Estimated portion description' },
                  calories: { type: Type.INTEGER, description: 'Estimated calories' },
                  protein: { type: Type.INTEGER, description: 'Protein in grams' },
                  carbs: { type: Type.INTEGER, description: 'Carbohydrates in grams' },
                  fat: { type: Type.INTEGER, description: 'Fat in grams' },
                },
                required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
          },
          required: ['items'],
        },
      },
    }));

    const parsed = JSON.parse(resultText || '{"items":[]}');
    return res.json({
      items: parsed.items || [],
      source: 'ai',
      modelUsed,
      notice: null,
    });
  } catch (error: any) {
    console.warn('[Gemini Fallback Activated] Models unavailable, using smart nutrition engine:', error?.message?.slice(0, 100));
    const fallbackItems = parseFallbackFoodItems(text);
    return res.json({
      items: fallbackItems,
      source: 'smart_fallback',
      notice: 'AI models currently experiencing peak demand. Estimated via smart nutrition engine — check and adjust portions as needed!',
    });
  }
});

// 3. Daily AI Insights
app.post('/api/daily-insights', async (req, res) => {
  const { totals, targets, mealsDescription, goal } = req.body;
  const remainingCals = Math.max(0, (targets?.calories || 2000) - (totals?.calories || 0));

  const fallbackSummary = `You've logged ${totals?.calories || 0} kcal today, pacing smoothly towards your daily target.`;
  const fallbackSuggestion =
    remainingCals > 400
      ? `With ${remainingCals} kcal remaining, a high-protein dinner like roasted salmon or seasoned tofu with quinoa and greens will hit your macro targets.`
      : remainingCals > 100
      ? `With ${remainingCals} kcal remaining, a light snack like Greek yogurt with berries or a handful of almonds will balance your macros perfectly.`
      : `You've hit your daily caloric target. Focus on clean hydration and recovery.`;

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        summary: fallbackSummary,
        suggestion: fallbackSuggestion,
      });
    }

    const prompt = `You are Fuelly's smart nutrition coach. Analyze the user's daily intake so far against their daily targets and goal:
User Goal: ${goal || 'maintain'}
Today's totals: Calories: ${totals?.calories || 0} kcal, Protein: ${totals?.protein || 0}g, Carbs: ${totals?.carbs || 0}g, Fat: ${totals?.fat || 0}g
Target targets: Calories: ${targets?.calories || 2000} kcal, Protein: ${targets?.protein || 130}g, Carbs: ${targets?.carbs || 220}g, Fat: ${targets?.fat || 65}g
Meals logged today: ${mealsDescription || 'None yet'}

Provide:
1. summary: A short, friendly 1-2 sentence summary of their nutritional pacing today.
2. suggestion: One highly practical, delicious suggestion for their next meal or snack based on what macros are still needed or what's left in their budget.`;

    const { text: resultText } = await callGeminiWithFallback(ai, (model) => ({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: '1-2 sentence friendly summary of the day' },
            suggestion: { type: Type.STRING, description: '1 practical suggestion for next meal' },
          },
          required: ['summary', 'suggestion'],
        },
      },
    }));

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error) {
    console.warn('Gemini daily insights fell back to smart rule engine:', (error as any)?.message?.slice(0, 80));
    return res.json({
      summary: fallbackSummary,
      suggestion: fallbackSuggestion,
    });
  }
});

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fuelly server listening on port ${PORT}`);
  });
}

startServer();
