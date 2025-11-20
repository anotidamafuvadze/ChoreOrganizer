import { Trophy, Crown, Star, TrendingUp } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';


// TODO: Replace with real leaderboard data fetching from backend
const leaderboardData = [
  { name: 'You', mascot: 'cat' as const, color: '#FFB6C1', points: 245, badge: 'Tidy Hero' },
  { name: 'Alex', mascot: 'bunny' as const, color: '#A7C7E7', points: 230, badge: 'Rising Star' },
  { name: 'Jamie', mascot: 'fox' as const, color: '#E6B8FF', points: 220, badge: 'Consistent' },
  { name: 'Sam', mascot: 'frog' as const, color: '#FFDAB9', points: 185, badge: '' },
];

export function LeaderboardPreview() {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-purple-700">MVP This Week</h3>
        </div>
      </div>

      {/* MVP Spotlight */}
      <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-6 mb-4 border-2 border-yellow-300 relative overflow-hidden">
        <div className="absolute top-2 right-2">
          <Crown className="w-8 h-8 text-yellow-500 opacity-20" />
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="bg-white/80 p-3 rounded-2xl shadow-md">
            <MascotIllustration 
              mascot={leaderboardData[0].mascot} 
              color={leaderboardData[0].color} 
              size={50}
              showSparkle
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-purple-700">{leaderboardData[0].name}</span>
            </div>
            <p className="text-purple-600">{leaderboardData[0].points} points</p>
            <span className="inline-block mt-1 text-xs bg-yellow-200 text-yellow-700 px-2 py-1 rounded-full">
              {leaderboardData[0].badge}
            </span>
          </div>
        </div>
      </div>

      {/* Other Roommates */}
      <div className="space-y-2 mb-4">
        {leaderboardData.slice(1, 3).map((roommate, index) => (
          <div
            key={roommate.name}
            className="bg-white/60 rounded-xl p-3 border border-purple-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-lg w-8 h-8 flex items-center justify-center text-purple-600 text-sm">
                  #{index + 2}
                </div>
                <MascotIllustration 
                  mascot={roommate.mascot} 
                  color={roommate.color} 
                  size={30}
                />
                <div>
                  <p className="text-purple-700 text-sm">{roommate.name}</p>
                  {roommate.badge && (
                    <span className="text-xs text-purple-500">{roommate.badge}</span>
                  )}
                </div>
              </div>
              <span className="text-purple-600 text-sm">{roommate.points}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gentle Slacker Notice */}
      {leaderboardData[3].points < 200 && (
        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-200">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-purple-600 text-sm">
                Let's cheer on {leaderboardData[3].name} next week! 💙
              </p>
              <p className="text-purple-400 text-xs mt-1">
                We're all learning together!
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
