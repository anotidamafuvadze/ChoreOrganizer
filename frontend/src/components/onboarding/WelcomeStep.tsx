import { Sparkles, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { MascotIllustration } from '../mascots/MascotIllustration';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50 text-center">
      <div className="inline-flex items-center justify-center bg-gradient-to-br from-yellow-200 to-pink-200 p-6 rounded-3xl shadow-lg mb-6">
        <Sparkles className="w-16 h-16 text-purple-600" />
      </div>
      
      <h1 className="text-purple-700 mb-4">
        Welcome to Chore, I'll do it!
      </h1>
      
      <p className="text-purple-500 mb-8 text-lg">
        Make household chores fun, fair, and stress-free with your roommates! ✨
      </p>

      {/* Illustration of dorm with mascots */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <Home className="w-full h-full text-purple-400" />
        </div>
        <div className="relative flex justify-center items-end gap-4">
          <div className="flex flex-col items-center">
            <MascotIllustration mascot="cat" color="#FFB6C1" size={70} />
            <div className="mt-2 bg-white/80 px-3 py-1 rounded-full text-xs text-purple-600">
              Alex
            </div>
          </div>
          <div className="flex flex-col items-center">
            <MascotIllustration mascot="bunny" color="#B4E7CE" size={70} />
            <div className="mt-2 bg-white/80 px-3 py-1 rounded-full text-xs text-purple-600">
              Jamie
            </div>
          </div>
          <div className="flex flex-col items-center">
            <MascotIllustration mascot="frog" color="#A7C7E7" size={70} />
            <div className="mt-2 bg-white/80 px-3 py-1 rounded-full text-xs text-purple-600">
              Sam
            </div>
          </div>
          <div className="flex flex-col items-center">
            <MascotIllustration mascot="fox" color="#FFDAB9" size={70} />
            <div className="mt-2 bg-white/80 px-3 py-1 rounded-full text-xs text-purple-600">
              Taylor
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-left bg-purple-50/50 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-yellow-200 to-yellow-300 p-2 rounded-xl mt-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-purple-700">Fair & Automatic</h3>
            <p className="text-purple-500 text-sm">Chores rotate based on preferences and fairness</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-pink-200 to-pink-300 p-2 rounded-xl mt-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-purple-700">Cute Mascots</h3>
            <p className="text-purple-500 text-sm">Choose an adorable animal friend to represent you</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-blue-200 to-blue-300 p-2 rounded-xl mt-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-purple-700">Positive Vibes Only</h3>
            <p className="text-purple-500 text-sm">Celebrate wins and support each other!</p>
          </div>
        </div>
      </div>

      <Button 
        onClick={onNext}
        className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg py-6 text-lg"
      >
        Get Started! 🎉
      </Button>
    </div>
  );
}
