import { useState } from "react";
import { Heart, Meh, X, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

interface PreferencesStepProps {
  chores: string[];
  onNext: (preferences: Record<string, "love" | "neutral" | "avoid">) => void;
  onBack?: () => void;
}

type Preference = "love" | "neutral" | "avoid";

export function PreferencesStep({
  chores,
  onNext,
  onBack,
}: PreferencesStepProps) {
  const [preferences, setPreferences] = useState<Record<string, Preference>>(
    {}
  );

  const setPreference = (chore: string, pref: Preference) => {
    setPreferences((prev) => ({ ...prev, [chore]: pref }));
  };

  const handleContinue = () => {
    // Set any unset preferences to neutral
    const completePrefs = { ...preferences };
    chores.forEach((chore) => {
      if (!completePrefs[chore]) {
        completePrefs[chore] = "neutral";
      }
    });
    onNext(completePrefs);
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50 max-h-[80vh] overflow-y-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-pink-200 to-purple-200 p-4 rounded-3xl shadow-lg mb-4">
          <Heart className="w-12 h-12 text-purple-600" />
        </div>
        <h2 className="text-purple-700 mb-2">Set Your Preferences</h2>
        <p className="text-purple-500">
          Tell us how you feel about each chore! We'll use this to assign fairly
          ✨
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {chores.map((chore) => (
          <div
            key={chore}
            className="bg-white/80 rounded-2xl p-4 border border-purple-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-purple-700">{chore}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreference(chore, "love")}
                  className={`p-3 rounded-xl transition-all ${
                    preferences[chore] === "love"
                      ? "bg-gradient-to-br from-pink-300 to-red-300 shadow-md scale-110"
                      : "bg-pink-50 hover:bg-pink-100"
                  }`}
                  title="Love it!"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      preferences[chore] === "love"
                        ? "text-red-600 fill-red-600"
                        : "text-pink-400"
                    }`}
                  />
                </button>

                <button
                  onClick={() => setPreference(chore, "neutral")}
                  className={`p-3 rounded-xl transition-all ${
                    preferences[chore] === "neutral"
                      ? "bg-gradient-to-br from-yellow-200 to-yellow-300 shadow-md scale-110"
                      : "bg-yellow-50 hover:bg-yellow-100"
                  }`}
                  title="It's okay"
                >
                  <Meh
                    className={`w-5 h-5 ${
                      preferences[chore] === "neutral"
                        ? "text-yellow-700"
                        : "text-yellow-400"
                    }`}
                  />
                </button>

                <button
                  onClick={() => setPreference(chore, "avoid")}
                  className={`p-3 rounded-xl transition-all ${
                    preferences[chore] === "avoid"
                      ? "bg-gradient-to-br from-gray-300 to-gray-400 shadow-md scale-110"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  title="Rather not"
                >
                  <X
                    className={`w-5 h-5 ${
                      preferences[chore] === "avoid"
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200 mb-6">
        <div className="flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span className="text-purple-600">Love it!</span>
          </div>
          <div className="flex items-center gap-2">
            <Meh className="w-4 h-4 text-yellow-500" />
            <span className="text-purple-600">It's okay</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-gray-500" />
            <span className="text-purple-600">Rather not</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
