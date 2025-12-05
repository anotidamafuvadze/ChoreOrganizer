import { Scale, TrendingUp } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';
import { useMemo, useEffect, useState } from "react";

// TODO: Replace with real roommates data fetching from backend
const roommatesData = [
  { name: 'You', mascot: 'cat' as const, color: '#FFB6C1', points: 245, percentage: 28 },
  { name: 'Alex', mascot: 'bunny' as const, color: '#A7C7E7', points: 230, percentage: 26 },
  { name: 'Jamie', mascot: 'fox' as const, color: '#E6B8FF', points: 220, percentage: 25 },
  { name: 'Sam', mascot: 'frog' as const, color: '#FFDAB9', points: 185, percentage: 21 },
];

export function FairnessMeter() {
  const [perUser, setPerUser] = useState<{ id: string; name: string; score: number }[]>(() =>
    roommatesData.map((r) => ({ id: r.name, name: r.name, score: r.points || 0 }))
  );
  const [totalPoints, setTotalPoints] = useState<number>(() =>
    roommatesData.reduce((s, r) => s + (r.points || 0), 0)
  );
  const [fairnessScore, setFairnessScore] = useState<number>(() => 92);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/household/fairness", { credentials: "include" });
        if (!mounted || !res.ok) return;
        const data = await res.json();
        if (!data) return;
        // perUser returned as [{id,name,score}], totalPoints, fairness
        if (Array.isArray(data.perUser) && mounted) {
          setPerUser(data.perUser.map((p: any) => ({ id: String(p.id), name: String(p.name), score: Number(p.score || 0) })));
          setTotalPoints(Number(data.totalPoints || 0));
          setFairnessScore(Number(data.fairness ?? 0));
        }
      } catch {
        // keep fallback/mock data when fetch fails
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Render: derive percentages using computed perUser + totalPoints
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-purple-700 mb-1">
            Fairness Meter
          </h3>
          <p className="text-purple-500 text-sm">
            How balanced are chore assignments this week? 🌟
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
          {fairnessScore >= 80 && "Looking great! Everyone's been given an equal amount of work"}
          {fairnessScore < 80 && fairnessScore >= 50 && "Pretty balanced — a little room to share tasks more evenly"}
          {fairnessScore < 50 && "Uneven distribution :( — We'll try to rotate chores a bit more next week"}
        </p>
      </div>

      {/* Contribution Chart */}
      <div>
        <p className="text-purple-600 text-sm mb-3">This Week's Distribution</p>
        <div className="space-y-3">
          {perUser.map((p) => {
            const room = roommatesData.find((r) => r.name === p.name);
            const color = room?.color ?? "#C4C4C4";
            const points = p.score;
            const pct = totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0;
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MascotIllustration
                      mascot={(room && room.mascot) ?? "cat"}
                      color={color}
                      size={30}
                    />
                    <span className="text-purple-700 text-sm">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-purple-600 text-sm">
                    {points} pts
                  </span>
                </div>
                <div className="h-2 bg-purple-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 bg-blue-50/50 rounded-2xl p-4 border border-blue-200">
        <p className="text-purple-600 text-sm text-center">
          {fairnessScore >= 80 ? "✨ Great teamwork! Everyone's pulling their weight this week!" : "🏷️ It seems that some people are doing harder chores than others and that's okay! We'll make sure to spread the love around a bit more next week :) If you want to help us out a bit, think about being willing to take on harder chores! "}
        </p>
      </div>
    </div>
  );
}
