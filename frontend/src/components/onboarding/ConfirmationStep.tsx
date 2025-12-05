import { Sparkles, Home, Check } from "lucide-react";
import { Button } from "../ui/button";
import { MascotIllustration } from "../mascots/MascotIllustration";

interface ConfirmationStepProps {
  household: string;
  mascot: { type: any; color: string };
  onComplete: () => void;
  onBack?: () => void;
}

export function ConfirmationStep({
  household,
  mascot,
  onComplete,
  onBack,
}: ConfirmationStepProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50 text-center">
      <div className="inline-flex items-center justify-center bg-gradient-to-br from-green-200 to-teal-200 p-6 rounded-full shadow-lg mb-6">
        <Check className="w-16 h-16 text-green-700" />
      </div>

      <h2 className="text-purple-700 mb-3">You're All Set! 🎉</h2>

      <p className="text-purple-500 mb-8 text-lg">
        Welcome to your chore-sharing journey!
      </p>

      {/* Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 mb-8 border border-purple-100">
        <div className="flex justify-center mb-6">
          <MascotIllustration
            mascot={mascot.type}
            color={mascot.color}
            size={100}
            showSparkle
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white/60 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-purple-500" />
              <span className="text-purple-600">Household</span>
            </div>
            <span className="text-purple-700">{household}</span>
          </div>

          <div className="flex items-center justify-between bg-white/60 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-purple-600">Your Mascot</span>
            </div>
            <div className="flex items-center gap-2">
              <MascotIllustration
                mascot={mascot.type}
                color={mascot.color}
                size={30}
              />
              <span className="text-purple-700 capitalize">{mascot.type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50/50 rounded-2xl p-6 border border-yellow-200 mb-8">
        <h3 className="text-purple-700 mb-3">Next Steps:</h3>
        <div className="space-y-2 text-left text-purple-600 text-sm">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Invite your roommates using the code in Settings</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Check out your personalized dashboard</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            <span>Complete chores and earn points!</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Button
          onClick={onBack}
          className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6 text-lg"
        >
          Back
        </Button>
        <Button
          onClick={onComplete}
          className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg py-6 text-lg"
        >
          Go to Dashboard! ✨
        </Button>
      </div>
      <p className="mt-6 text-purple-400 text-sm">
        You've got this! Let's make chores fun! 💜
      </p>
    </div>
  );
}
