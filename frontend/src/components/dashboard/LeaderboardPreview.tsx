import { Trophy, Crown, Star, TrendingUp } from "lucide-react";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { useEffect, useState } from "react";
import { User } from "../../App";

interface LeaderboardPreviewProps {
  currentUser: User;
}

export function LeaderboardPreview({ currentUser }: LeaderboardPreviewProps) {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("http://localhost:3000/api/users", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const allUsers: any[] = data?.users || [];

        // Filter by householdId if possible
        const householdId = (currentUser as any)?.householdId ?? null;
        let members = allUsers;
        if (householdId) {
          members = allUsers.filter(
            (u) => String(u.householdId) === String(householdId)
          );
        } else {
          const me = allUsers.find(
            (u) => u.id === currentUser.id || u.email === currentUser.email
          );
          if (me && me.householdId) {
            members = allUsers.filter(
              (u) => String(u.householdId) === String(me.householdId)
            );
          }
        }

        // Sort by points desc
        members.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));

        if (!mounted) return;
        setMembers(members.slice(0, 4));
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const top = members[0] || null;
  const others = members.slice(1, 3);
  const fourth = members[3] || null;

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
        {top ? (
          <div className="flex items-center gap-4 relative">
            <div className="bg-white/80 p-3 rounded-2xl shadow-md">
              <MascotIllustration
                mascot={top.mascot || "cat"}
                color={top.color || "#FFB6C1"}
                size={50}
                showSparkle
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-yellow-600" />
                <span className="text-purple-700">{top.name}</span>
              </div>
              <p className="text-purple-600">
                {Number(top.points || 0)} points
              </p>
              <span className="inline-block mt-1 text-xs bg-yellow-200 text-yellow-700 px-2 py-1 rounded-full">
                {top.badge || "Top Contributor"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-purple-500">No leaderboard data yet</p>
        )}
      </div>

      {/* Other Roommates */}
      <div className="space-y-2 mb-4">
        {others.map((roommate: any, index: number) => (
          <div
            key={roommate.id || roommate.name}
            className="bg-white/60 rounded-xl p-3 border border-purple-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-lg w-8 h-8 flex items-center justify-center text-purple-600 text-sm">
                  #{index + 2}
                </div>
                <MascotIllustration
                  mascot={roommate.mascot || "cat"}
                  color={roommate.color || "#DDD"}
                  size={30}
                />
                <div>
                  <p className="text-purple-700 text-sm">{roommate.name}</p>
                  {roommate.badge && (
                    <span className="text-xs text-purple-500">
                      {roommate.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-purple-600 text-sm">
                {Number(roommate.points || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gentle Slacker Notice */}
      {fourth && Number(fourth.points || 0) < 200 && (
        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-200">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-purple-600 text-sm">
                Let's cheer on {fourth.name} next week! 💙
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
