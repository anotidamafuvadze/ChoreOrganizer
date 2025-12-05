import { Scale, TrendingUp } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';
import { useMemo } from "react";

// TODO: Replace with real roommates data fetching from backend
const roommatesData = [
  { name: 'You', mascot: 'cat' as const, color: '#FFB6C1', points: 245, percentage: 28 },
  { name: 'Alex', mascot: 'bunny' as const, color: '#A7C7E7', points: 230, percentage: 26 },
  { name: 'Jamie', mascot: 'fox' as const, color: '#E6B8FF', points: 220, percentage: 25 },
  { name: 'Sam', mascot: 'frog' as const, color: '#FFDAB9', points: 185, percentage: 21 },
];

export function FairnessMeter() {
  // NOTE: replace sampleChores with a real fetch from your backend returning
  // chores: { id, name, points, assignedToName | assignedToId, ... }
  const sampleChores = [
    { id: "chore_1", name: "Take Out Trash", points: 3, assignedTo: "You" },
    { id: "chore_2", name: "Wash Dishes", points: 5, assignedTo: "Alex" },
    { id: "chore_3", name: "Sweep Living Room", points: 4, assignedTo: "Jamie" },
    { id: "chore_4", name: "Clean Kitchen", points: 6, assignedTo: "You" },
    // add more or replace with real data
  ];

  // Aggregate points per user (name-based). If your chores use user IDs, map IDs -> names first.
  const { perUser, totalPoints, fairnessScore } = useMemo(() => {
    const scores = new Map<string, number>();
    // initialize with roommates (ensures every roommate appears even if zero)
    for (const r of roommatesData) scores.set(r.name, 0);

    for (const c of sampleChores) {
      const assignee = c.assignedTo ?? "";
      const pts = typeof c.points === "number" ? c.points : 0;
      if (!assignee) continue;
      scores.set(assignee, (scores.get(assignee) || 0) + pts);
    }

    const entries = Array.from(scores.entries()).map(([name, score]) => ({ name, score }));
    const total = entries.reduce((s, e) => s + e.score, 0);

    // Gini coefficient (0..1), then map to fairness = (1 - gini) * 100
    function gini(values: number[]) {
      const n = values.length;
      if (n === 0) return 0;
      const sorted = values.slice().sort((a, b) => a - b);
      const sum = sorted.reduce((s, v) => s + v, 0);
      if (sum === 0) return 0;
      let accum = 0;
      for (let i = 0; i < n; i++) accum += (i + 1) * sorted[i];
      const g = (2 * accum) / (n * sum) - (n + 1) / n;
      return Math.max(0, Math.min(1, g));
    }

    const values = entries.map((e) => e.score);
    const g = gini(values);
    const fairness = Math.round(Math.max(0, Math.min(100, (1 - g) * 100)));

    return { perUser: entries, totalPoints: total, fairnessScore: fairness };
  }, [sampleChores]);

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
          {perUser.map((p, index) => {
            const room = roommatesData.find((r) => r.name === p.name);
            const color = room?.color ?? "#C4C4C4";
            const points = p.score;
            const pct = totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0;
            return (
              <div key={p.name}>
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
