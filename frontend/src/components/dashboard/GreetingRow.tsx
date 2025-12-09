import { Sparkles, Sun, Moon } from "lucide-react";
import { User } from "../../App";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { useEffect, useState } from "react";

interface GreetingRowProps {
  currentUser: User;
}

export function GreetingRow({ currentUser }: GreetingRowProps) {
  const [roommates, setRoommates] = useState<
    { name: string; mascot?: string | null; color?: string | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoommates() {
      try {
        // Try to read householdId from currentUser first (may exist on server responses)
        let householdId = (currentUser as any)?.householdId ?? null;

        // Fallback: fetch session to get householdId if not present
        if (!householdId) {
          try {
            const s = await fetch("http://localhost:3000/api/session", {
              method: "GET",
              mode: "cors",
              credentials: "include",
            });
            if (s.ok) {
              const sd = await s.json().catch(() => null);
              householdId = sd?.householdId ?? null;
            }
          } catch {
            householdId = null;
          }
        }

        if (!householdId) {
          if (!cancelled) setRoommates([]);
          return;
        }

        const res = await fetch(
          `http://localhost:3000/api/household/${encodeURIComponent(
            String(householdId)
          )}/roommates`,
          { method: "GET", mode: "cors", credentials: "include" }
        );
        if (!res.ok) {
          if (!cancelled) setRoommates([]);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!cancelled)
          setRoommates(Array.isArray(data?.roommates) ? data.roommates : []);
      } catch {
        if (!cancelled) setRoommates([]);
      }
    }

    loadRoommates();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 18) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Moon };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div className="bg-gradient-to-br from-yellow-100/80 to-pink-100/80 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/80 p-4 rounded-2xl shadow-sm">
            <MascotIllustration
              mascot={currentUser.mascot}
              color={currentUser.color}
              size={60}
              showSparkle
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GreetingIcon className="w-5 h-5 text-yellow-600" />
              <h2 className="text-purple-700">
                {greeting.text}
                {currentUser && currentUser.name ? `, ${currentUser.name}` : ""}
                !
              </h2>
            </div>
            <p className="text-purple-600 text-lg">
              You're doing great this week! ✨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-purple-500 text-sm text-right mb-2">
              Your Roomies
            </p>
            <div className="flex -space-x-3">
              {roommates.map((roommate, idx) => (
                <div key={idx} className="relative group" title={roommate.name}>
                  <div className="bg-white/90 rounded-full p-2 border-2 border-white shadow-md hover:scale-110 transition-transform">
                    <MascotIllustration
                      mascot={(roommate as any).mascot}
                      color={(roommate as any).color}
                      size={35}
                    />
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-purple-700 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {roommate.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl px-6 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-purple-500 text-xs">Your Points</p>

                {/* TODO: Replace with real points fetching */}
                <p className="text-purple-700 text-xl">245</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
