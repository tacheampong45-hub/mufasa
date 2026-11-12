import React, { useState } from 'react';
import { FoodItem, MealType } from '../types/nutrition';
import { Plus, Trash2, Check, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FoodConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: Omit<FoodItem, 'id'>[];
  selectedMeal: MealType;
  onConfirm: (items: FoodItem[], targetMeal: MealType) => void;
  notice?: string | null;
  isFallback?: boolean;
}

export const FoodConfirmModal: React.FC<FoodConfirmModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  selectedMeal: initialSelectedMeal,
  onConfirm,
  notice,
  isFallback,
}) => {
  const [targetMeal, setTargetMeal] = useState<MealType>(initialSelectedMeal);
  const [items, setItems] = useState<FoodItem[]>(() =>
    initialItems.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`,
    }))
  );

  // Sync if initial items update
  React.useEffect(() => {
    setItems(
      initialItems.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}`,
      }))
    );
    setTargetMeal(initialSelectedMeal);
  }, [initialItems, initialSelectedMeal]);

  if (!isOpen) return null;

  const handleUpdateItem = (
    id: string,
    field: keyof Omit<FoodItem, 'id'>,
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          [field]: field === 'name' || field === 'portion' ? val : Math.max(0, Number(val) || 0),
        };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddCustomItem = () => {
    const newItem: FoodItem = {
      id: `item-${Date.now()}-${items.length}`,
      name: 'Custom Food Item',
      portion: '1 serving',
      calories: 150,
      protein: 10,
      carbs: 15,
      fat: 5,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const totalCalories = items.reduce((acc, cur) => acc + (Number(cur.calories) || 0), 0);
  const totalProtein = items.reduce((acc, cur) => acc + (Number(cur.protein) || 0), 0);
  const totalCarbs = items.reduce((acc, cur) => acc + (Number(cur.carbs) || 0), 0);
  const totalFat = items.reduce((acc, cur) => acc + (Number(cur.fat) || 0), 0);

  const handleConfirm = () => {
    if (items.length === 0) {
      onClose();
      return;
    }
    onConfirm(items, targetMeal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-7 my-8 shadow-2xl border border-white/20 relative"
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF8C66] to-[#FF5E7E] flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Review & Confirm Meal
              </h2>
              <p className="text-xs text-slate-400">
                {isFallback
                  ? 'Estimated via Smart Nutrition Engine · Adjust any values below before logging.'
                  : 'Parsed by Gemini AI · Edit any portion or macro value before saving.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner (e.g. high-demand fallback info) */}
        {notice && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Meal Category Destination Switcher */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Assign to Meal Bucket:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => setTargetMeal(meal)}
                className={`py-2 px-3 text-xs font-semibold rounded-2xl capitalize transition-all border ${
                  targetMeal === meal
                    ? 'bg-gradient-to-r from-[#FF8C66]/90 to-[#FF5E7E]/90 text-white border-white/30 shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        {/* Food Items List */}
        <div className="mt-5 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="glass-card-interactive rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Food name"
                      className="w-full text-sm font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-orange-400/80 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="w-36">
                    <input
                      type="text"
                      value={item.portion}
                      onChange={(e) => handleUpdateItem(item.id, 'portion', e.target.value)}
                      placeholder="e.g. 2 large eggs"
                      className="w-full text-xs text-slate-300 text-right bg-transparent border-b border-transparent hover:border-white/20 focus:border-orange-400/80 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Macro Inputs Row */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                  <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                    <span className="text-[10px] text-orange-200 block font-medium">Calories</span>
                    <input
                      type="number"
                      value={item.calories}
                      onChange={(e) => handleUpdateItem(item.id, 'calories', e.target.value)}
                      className="w-full text-center text-xs font-bold text-white bg-transparent focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500">kcal</span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                    <span className="text-[10px] text-rose-300 block font-medium">Protein</span>
                    <input
                      type="number"
                      value={item.protein}
                      onChange={(e) => handleUpdateItem(item.id, 'protein', e.target.value)}
                      className="w-full text-center text-xs font-bold text-white bg-transparent focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500">g</span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                    <span className="text-[10px] text-amber-300 block font-medium">Carbs</span>
                    <input
                      type="number"
                      value={item.carbs}
                      onChange={(e) => handleUpdateItem(item.id, 'carbs', e.target.value)}
                      className="w-full text-center text-xs font-bold text-white bg-transparent focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500">g</span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                    <span className="text-[10px] text-blue-300 block font-medium">Fat</span>
                    <input
                      type="number"
                      value={item.fat}
                      onChange={(e) => handleUpdateItem(item.id, 'fat', e.target.value)}
                      className="w-full text-center text-xs font-bold text-white bg-transparent focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500">g</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No items in this meal batch. Click below to add an item.
            </div>
          )}
        </div>

        {/* Add Another Item Button */}
        <button
          type="button"
          onClick={handleAddCustomItem}
          className="mt-3 w-full py-2.5 rounded-2xl border border-dashed border-white/20 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Another Food Item
        </button>

        {/* Total Summary Strip & Confirm Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-xl">
              {totalCalories} kcal
            </span>
            <span className="text-slate-300">
              P: <strong className="text-white">{totalProtein}g</strong>
            </span>
            <span className="text-slate-300">
              C: <strong className="text-white">{totalCarbs}g</strong>
            </span>
            <span className="text-slate-300">
              F: <strong className="text-white">{totalFat}g</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="glass-button-secondary py-2.5 px-4 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleConfirm}
              className="glass-button-primary flex-1 sm:flex-initial py-2.5 px-6 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Log to {targetMeal}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
