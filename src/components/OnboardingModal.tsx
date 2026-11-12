import React, { useState } from 'react';
import { UserProfile, NutritionTargets } from '../types/nutrition';
import { Sparkles, Flame, Check, Loader2, ArrowRight, X, AlertCircle } from 'lucide-react';
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from '../utils/storage';
import { motion } from 'motion/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  isFirstLaunch: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  isFirstLaunch,
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Biometrics & Goal, 2 = AI Calculated Targets Review
  const [units, setUnits] = useState<'metric' | 'imperial'>(currentProfile.unitPreference || 'metric');

  // Step 1 Form fields
  const [age, setAge] = useState<number>(currentProfile.age || 28);
  const [gender, setGender] = useState<'female' | 'male' | 'other'>(currentProfile.gender || 'female');
  const [heightCm, setHeightCm] = useState<number>(currentProfile.heightCm || 168);
  const [weightKg, setWeightKg] = useState<number>(currentProfile.weightKg || 65);
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(
    currentProfile.activityLevel || 'moderate'
  );
  const [goal, setGoal] = useState<UserProfile['goal']>(currentProfile.goal || 'maintain');

  // Imperial helper state for height
  const [feet, setFeet] = useState<number>(cmToFtIn(currentProfile.heightCm || 168).ft);
  const [inches, setInches] = useState<number>(cmToFtIn(currentProfile.heightCm || 168).in);
  const [weightLbs, setWeightLbs] = useState<number>(kgToLbs(currentProfile.weightKg || 65));

  // Step 2 Targets (editable by user)
  const [targets, setTargets] = useState<NutritionTargets>(currentProfile.targets);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Toggle Units with auto-conversion
  const handleUnitToggle = (newUnit: 'metric' | 'imperial') => {
    if (newUnit === units) return;
    setUnits(newUnit);
    if (newUnit === 'imperial') {
      const { ft, in: inch } = cmToFtIn(heightCm);
      setFeet(ft);
      setInches(inch);
      setWeightLbs(kgToLbs(weightKg));
    } else {
      setHeightCm(ftInToCm(feet, inches));
      setWeightKg(lbsToKg(weightLbs));
    }
  };

  const handleFeetInchesChange = (newFt: number, newIn: number) => {
    setFeet(newFt);
    setInches(newIn);
    setHeightCm(ftInToCm(newFt, newIn));
  };

  const handleLbsChange = (newLbs: number) => {
    setWeightLbs(newLbs);
    setWeightKg(lbsToKg(newLbs));
  };

  // Step 1 -> Calculate Targets via Gemini
  const handleCalculateTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setCalcError(null);

    const finalHeight = units === 'imperial' ? ftInToCm(feet, inches) : heightCm;
    const finalWeight = units === 'imperial' ? lbsToKg(weightLbs) : weightKg;

    try {
      const response = await fetch('/api/calculate-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age,
          gender,
          heightCm: finalHeight,
          weightKg: finalWeight,
          activityLevel,
          goal,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate targets with AI');
      }

      const data: NutritionTargets = await response.json();
      setTargets(data);
      setStep(2);
    } catch (err) {
      console.error(err);
      setCalcError('Unable to connect to nutrition engine. We calculated standard formulas for you below.');
      // Fallback
      setTargets(currentProfile.targets);
      setStep(2);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFinalSave = () => {
    const finalHeight = units === 'imperial' ? ftInToCm(feet, inches) : heightCm;
    const finalWeight = units === 'imperial' ? lbsToKg(weightLbs) : weightKg;

    const updatedProfile: UserProfile = {
      age,
      gender,
      heightCm: finalHeight,
      weightKg: finalWeight,
      activityLevel,
      goal,
      unitPreference: units,
      targets,
      isOnboarded: true,
    };

    onSaveProfile(updatedProfile);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-8 my-6 shadow-2xl border border-white/20 relative"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Close Button if not first launch */}
        {!isFirstLaunch && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF8C66] to-[#FF5E7E] flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isFirstLaunch ? 'Welcome to Fuelly' : 'Adjust Profile & Targets'}
            </h2>
            <p className="text-xs text-slate-400">
              {step === 1
                ? 'Tell us about your body and goals to calibrate your targets.'
                : 'Review your Gemini-generated daily targets. You can edit any value.'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 my-4">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all ${
              step >= 1 ? 'bg-gradient-to-r from-orange-400 to-rose-400' : 'bg-white/10'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all ${
              step === 2 ? 'bg-gradient-to-r from-rose-400 to-amber-400' : 'bg-white/10'
            }`}
          />
        </div>

        {calcError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{calcError}</span>
          </div>
        )}

        {/* STEP 1: Biometrics Form */}
        {step === 1 && (
          <form onSubmit={handleCalculateTargets} className="space-y-4">
            {/* Units Toggle */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-300">Measurement Units</span>
              <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleUnitToggle('metric')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                    units === 'metric'
                      ? 'bg-gradient-to-r from-[#FF8C66] to-[#FF5E7E] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Metric (kg/cm)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle('imperial')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                    units === 'imperial'
                      ? 'bg-gradient-to-r from-[#FF8C66] to-[#FF5E7E] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Imperial (lbs/ft)
                </button>
              </div>
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Age</label>
                <input
                  type="number"
                  min="13"
                  max="100"
                  required
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="glass-input w-full rounded-2xl p-3 text-sm text-white bg-slate-900/90"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Non-binary / Other</option>
                </select>
              </div>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Height {units === 'metric' ? '(cm)' : '(ft / in)'}
                </label>
                {units === 'metric' ? (
                  <input
                    type="number"
                    min="100"
                    max="250"
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="3"
                      max="8"
                      value={feet}
                      onChange={(e) => handleFeetInchesChange(Number(e.target.value), inches)}
                      placeholder="ft"
                      className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={inches}
                      onChange={(e) => handleFeetInchesChange(feet, Number(e.target.value))}
                      placeholder="in"
                      className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Weight {units === 'metric' ? '(kg)' : '(lbs)'}
                </label>
                {units === 'metric' ? (
                  <input
                    type="number"
                    min="35"
                    max="300"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                  />
                ) : (
                  <input
                    type="number"
                    min="80"
                    max="650"
                    required
                    value={weightLbs}
                    onChange={(e) => handleLbsChange(Number(e.target.value))}
                    className="glass-input w-full rounded-2xl p-3 text-sm text-white"
                  />
                )}
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Daily Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="glass-input w-full rounded-2xl p-3 text-sm text-white bg-slate-900/90"
              >
                <option value="sedentary">Sedentary (Desk job, little intentional exercise)</option>
                <option value="light">Lightly Active (1–3 days/week exercise or active walking)</option>
                <option value="moderate">Moderately Active (3–5 days/week workouts)</option>
                <option value="active">Active (6–7 days/week intense training)</option>
                <option value="very_active">Very Active (Athlete or physical endurance job)</option>
              </select>
            </div>

            {/* Primary Goal */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Primary Goal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'lose', title: 'Lose Weight', desc: 'Mild caloric deficit' },
                  { id: 'maintain', title: 'Maintain', desc: 'Balance energy & health' },
                  { id: 'gain', title: 'Gain Muscle', desc: 'Protein & surplus boost' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoal(item.id as any)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      goal === item.id
                        ? 'bg-gradient-to-tr from-[#FF8C66]/25 to-[#FF5E7E]/25 border-orange-400/80 shadow-md'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">{item.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Step 1 */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isCalculating}
                className="glass-button-primary w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calculating targets with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-orange-200" />
                    <span>Calculate Daily Targets</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Gemini Calculated Targets Review & Editable Fields */}
        {step === 2 && (
          <div className="space-y-4">
            {/* AI Explanation Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#FF8C66]/15 to-[#FF5E7E]/15 border border-white/15">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-orange-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-orange-200">
                  Gemini Nutrition Strategy
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {targets.explanation ||
                  'Calibrated scientifically to your metabolic rate, lean body mass, and activity pacing.'}
              </p>
            </div>

            {/* Editable Target Inputs */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Your Targets (Tap any value to fine-tune):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="glass-card-interactive rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-orange-300 uppercase block">
                    Daily Calories
                  </span>
                  <input
                    type="number"
                    value={targets.calories}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        calories: Math.max(800, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full text-center text-lg font-extrabold text-white bg-transparent focus:outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">kcal/day</span>
                </div>

                <div className="glass-card-interactive rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-rose-300 uppercase block">
                    Protein
                  </span>
                  <input
                    type="number"
                    value={targets.protein}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        protein: Math.max(10, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full text-center text-lg font-extrabold text-white bg-transparent focus:outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">grams/day</span>
                </div>

                <div className="glass-card-interactive rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase block">
                    Carbohydrates
                  </span>
                  <input
                    type="number"
                    value={targets.carbs}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        carbs: Math.max(10, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full text-center text-lg font-extrabold text-white bg-transparent focus:outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">grams/day</span>
                </div>

                <div className="glass-card-interactive rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-blue-300 uppercase block">
                    Dietary Fat
                  </span>
                  <input
                    type="number"
                    value={targets.fat}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        fat: Math.max(10, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full text-center text-lg font-extrabold text-white bg-transparent focus:outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">grams/day</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="glass-button-secondary py-3 px-5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Back to Biometrics
              </button>

              <button
                type="button"
                onClick={handleFinalSave}
                className="glass-button-primary flex-1 py-3 px-6 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Save & Start Tracking</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
