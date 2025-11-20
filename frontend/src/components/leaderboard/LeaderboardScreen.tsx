import { Trophy, Crown, Star, TrendingUp, Award, Heart } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';

// TODO : Replace with real leaderboard data fetching from backend
const leaderboardData = [
  { 
    rank: 1, 
    name: 'You', 
    mascot: 'cat' as const, 
    color: '#FFB6C1', 
    points: 245, 
    choresCompleted: 18,
    badge: 'Tidy Hero',
    badgeColor: 'from-yellow-200 to-orange-200'
  },
  { 
    rank: 2, 
    name: 'Alex', 
    mascot: 'bunny' as const, 
    color: '#A7C7E7', 
    points: 230,
    choresCompleted: 17,
    badge: 'Rising Star',
    badgeColor: 'from-blue-200 to-purple-200'
  },
  { 
    rank: 3, 
    name: 'Jamie', 
    mascot: 'fox' as const, 
    color: '#E6B8FF', 
    points: 220,
    choresCompleted: 16,
    badge: 'Consistent',
    badgeColor: 'from-purple-200 to-pink-200'
  },
  { 
    rank: 4, 
    name: 'Sam', 
    mascot: 'frog' as const, 
    color: '#FFDAB9', 
    points: 185,
    choresCompleted: 13,
    badge: '',
    badgeColor: ''
  },
];

export function LeaderboardScreen() {
  const mvp = leaderboardData[0];
  const slacker = leaderboardData[leaderboardData.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-purple-700 mb-2">
          Weekly MVP & Leaderboard
        </h2>
        <p className="text-purple-500">
          Celebrate your household's chore champions! 🏆
        </p>
      </div>

      {/* MVP Spotlight */}
      <div className="bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 backdrop-blur-sm rounded-3xl p-12 border-2 border-yellow-300 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <Crown className="w-full h-full text-yellow-500" />
        </div>
        
        <div className="relative text-center">
          <div className="inline-block mb-6">
            <div className="bg-white/90 p-8 rounded-3xl shadow-xl relative">
              <div className="absolute -top-6 -right-6">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-3 rounded-2xl shadow-lg">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>
              <MascotIllustration 
                mascot={mvp.mascot} 
                color={mvp.color} 
                size={150}
                showSparkle
              />
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-6 inline-block min-w-[300px]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-yellow-600" />
              <h3 className="text-purple-700 text-2xl">MVP of the Week</h3>
            </div>
            <p className="text-purple-700 text-3xl mb-3">{mvp.name}</p>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <p className="text-purple-500 text-sm">Points</p>
                <p className="text-purple-700 text-2xl">{mvp.points}</p>
              </div>
              <div className="w-px h-12 bg-purple-200"></div>
              <div>
                <p className="text-purple-500 text-sm">Chores Done</p>
                <p className="text-purple-700 text-2xl">{mvp.choresCompleted}</p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${mvp.badgeColor} px-4 py-2 rounded-full`}>
              <Star className="w-4 h-4 text-yellow-700" />
              <span className="text-yellow-800">{mvp.badge}</span>
            </div>
          </div>

          <div className="mt-6 bg-white/60 rounded-2xl p-4 max-w-md mx-auto">
            <p className="text-purple-700 text-lg">
              "Amazing work this week! You're a true household hero! 💜"
            </p>
          </div>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-purple-500" />
          <h3 className="text-purple-700">Full Leaderboard</h3>
        </div>

        <div className="space-y-4">
          {leaderboardData.map((person) => {
            const isFirst = person.rank === 1;
            const isSecond = person.rank === 2;
            const isThird = person.rank === 3;
            
            return (
              <div
                key={person.rank}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  isFirst
                    ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 shadow-lg'
                    : isSecond
                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                    : isThird
                    ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300'
                    : 'bg-white/80 border-purple-100'
                }`}
              >
                <div className="flex items-center gap-6">
                  {/* Rank */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                    isFirst
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white'
                      : isSecond
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      : isThird
                      ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    #{person.rank}
                  </div>

                  {/* Mascot */}
                  <div className="bg-white/80 p-3 rounded-2xl shadow-sm">
                    <MascotIllustration 
                      mascot={person.mascot} 
                      color={person.color} 
                      size={60}
                      showSparkle={isFirst}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-purple-700 text-xl">{person.name}</p>
                      {person.badge && (
                        <span className={`text-xs bg-gradient-to-r ${person.badgeColor} px-3 py-1 rounded-full text-purple-700`}>
                          {person.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span className="text-purple-600">{person.points} points</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-purple-500" />
                        <span className="text-purple-600">{person.choresCompleted} chores</span>
                      </div>
                    </div>
                  </div>

                  {/* Crown for MVP */}
                  {isFirst && (
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-3 rounded-2xl shadow-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
   
    </div>
  );
}
