import { Scale, TrendingUp } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';

// TODO: Replace with real roommates data fetching from backend
const roommatesData = [
  { name: 'You', mascot: 'cat' as const, color: '#FFB6C1', points: 245, percentage: 28 },
  { name: 'Alex', mascot: 'bunny' as const, color: '#A7C7E7', points: 230, percentage: 26 },
  { name: 'Jamie', mascot: 'fox' as const, color: '#E6B8FF', points: 220, percentage: 25 },
  { name: 'Sam', mascot: 'frog' as const, color: '#FFDAB9', points: 185, percentage: 21 },
];

export function FairnessMeter() {

  // TODO: Replace with real fairness calculation
  const totalPoints = roommatesData.reduce((sum, r) => sum + r.points, 0);
  const fairnessScore = 92; // Mock fairness calculation

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-purple-700 mb-1">
            Fairness Meter
          </h3>
          <p className="text-purple-500 text-sm">
            How balanced is your household? 🌟
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-teal-100 p-3 rounded-2xl">
          <Scale className="w-6 h-6 text-green-600" />
        </div>
      </div>

      {/* Fairness Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-600 text-sm">Fairness Score</span>
          <span className="text-purple-700">{fairnessScore}%</span>
        </div>
        <div className="h-4 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${fairnessScore}%` }}
          />
        </div>
        <p className="text-purple-500 text-xs mt-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {/* TODO: Make this a dynamic message based on score */}
          Looking great! Everyone's contributing well /
        </p>
      </div>

      {/* Contribution Chart */}
      <div>
        <p className="text-purple-600 text-sm mb-3">This Week's Contributions</p>
        <div className="space-y-3">
          {roommatesData.map((roommate, index) => (
            <div key={roommate.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MascotIllustration 
                    mascot={roommate.mascot} 
                    color={roommate.color} 
                    size={30}
                  />
                  <span className="text-purple-700 text-sm">
                    {roommate.name}
                  </span>
                </div>
                <span className="text-purple-600 text-sm">
                  {roommate.points} pts
                </span>
              </div>
              <div className="h-2 bg-purple-50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${roommate.percentage}%`,
                    backgroundColor: roommate.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-blue-50/50 rounded-2xl p-4 border border-blue-200">
        <p className="text-purple-600 text-sm text-center">
          {/* TODO: Make this a dynamic message based on fairness score */}
          ✨ Great teamwork! Everyone's pulling their weight this week!
        </p>
      </div>
    </div>
  );
}
