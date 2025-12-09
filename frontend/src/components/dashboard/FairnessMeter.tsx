import { Scale, TrendingUp } from "lucide-react";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { useEffect, useState } from "react";
import { User } from "../../App";

interface Roommate {
  id?: string;
  name: string;
  mascot: any;
  color: string;
  points: number;
  percentage: number;
}

interface FairnessMeterProps {
  currentUser: User;
}

export function FairnessMeter({ currentUser }: FairnessMeterProps) {
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [fairnessScore, setFairnessScore] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    async function loadRoommates() {
      try {
        const res = await fetch("http://localhost:3000/api/users", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const allUsers: any[] = data?.users || [];

        // Try to filter by householdId if currentUser has it, otherwise fallback to user's household name via session
        const householdId = (currentUser as any)?.householdId ?? null;

        let members = allUsers;
        if (householdId) {
          members = allUsers.filter(
            (u) => String(u.householdId) === String(householdId)
          );
        } else if ((currentUser as any)?.email) {
          // As a fallback, include users that share the same householdId as the current user (if any)
          const current = allUsers.find(
            (u) => u.id === currentUser.id || u.email === currentUser.email
          );
          if (current && current.householdId) {
            members = allUsers.filter(
              (u) => String(u.householdId) === String(current.householdId)
            );
          }
        }

        // Build roommate objects with points
        const mapped: Roommate[] = members.map((m) => ({
          id: m.id,
          name: m.name || m.email || "Unknown",
          mascot: m.mascot || "cat",
          color: m.color || "#DDD",
          points: typeof m.points === "number" ? m.points : 0,
          percentage: 0,
        }));

        const total = mapped.reduce((s, r) => s + r.points, 0) || 1;
        const withPercent = mapped.map((r) => ({
          ...r,
          percentage: Math.round((r.points / total) * 100),
        }));

        if (!mounted) return;
        setRoommates(withPercent);
        // Simple fairness score: 100 - normalized standard deviation (quick heuristic)
        const avg = total / withPercent.length;
        const variance =
          withPercent.reduce((s, r) => s + Math.pow(r.points - avg, 2), 0) /
          withPercent.length;
        const std = Math.sqrt(variance);
        const score = Math.max(0, Math.round(100 - (std / (avg || 1)) * 50));
        setFairnessScore(score);
      } catch (e) {
        // ignore
      }
    }

    loadRoommates();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const totalPoints = roommates.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-purple-700 mb-1">Fairness Meter</h3>
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
          {fairnessScore > 80
            ? "Looking great! Everyone is contributing well."
            : "There’s room to balance chores."}
        </p>
      </div>

      {/* Contribution Chart */}
      <div>
        <p className="text-purple-600 text-sm mb-3">
          This Week's Contributions
        </p>
        <div className="space-y-3">
          {roommates.map((roommate) => (
            <div key={roommate.id || roommate.name}>
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
                    backgroundColor: roommate.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-blue-50/50 rounded-2xl p-4 border border-blue-200">
        <p className="text-purple-600 text-sm text-center">
          {fairnessScore > 80
            ? "✨ Great teamwork! Everyone’s pulling their weight this week!"
            : "Try reassigning a few chores to balance the load."}
        </p>
      </div>
    </div>
  );
}
