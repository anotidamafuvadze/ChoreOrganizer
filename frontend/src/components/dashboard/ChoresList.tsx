import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { User } from "../../App";
import { Checkbox } from "../ui/checkbox";

interface ChoresListProps {
  currentUser: User;
  onUserUpdate?: (u: User) => void;
}

async function fetchChores(identifier: string) {
  try {
    const isEmail = identifier.includes("@");
    const q = isEmail
      ? `email=${encodeURIComponent(identifier)}`
      : `userId=${encodeURIComponent(identifier)}`;

    const res = await fetch(`http://localhost:3000/api/chores?${q}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) return { chores: [], householdName: null };

    const data = await res.json();
    return {
      chores: data?.chores || [],
      householdName: data?.householdName || null,
    };
  } catch {
    return { chores: [], householdName: null };
  }
}

function computeDueDay(dueDate?: string) {
  if (!dueDate) return "";
  const due = new Date(dueDate);
  const today = new Date();

  const diff = Math.floor(
    (due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";

  return due.toLocaleDateString(undefined, { weekday: "long" });
}

export function ChoresList({ currentUser, onUserUpdate }: ChoresListProps) {
  const [chores, setChores] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<{
    identifier?: string;
    count?: number;
    householdName?: string;
    lastError?: string;
  } | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [confettiId, setConfettiId] = useState<string | null>(null);

  // -----------------------------
  // Load Chores
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    async function loadChores() {
      if (!currentUser) return;

      let id = currentUser.id;

      // fallback if missing ID → check local storage
      if (!id) {
        try {
          const cached = JSON.parse(localStorage.getItem("session:user") || "");
          if (cached?.id) id = cached.id;
        } catch {}
      }

      // fallback if still missing → lookup by email
      if (!id && currentUser.email) {
        try {
          const meRes = await fetch(
            `http://localhost:3000/api/user/me?email=${encodeURIComponent(
              currentUser.email
            )}`,
            { credentials: "include" }
          );
          const meData = meRes.ok ? await meRes.json() : null;

          if (meData?.user) {
            id = meData.user.id;
            onUserUpdate?.(meData.user);
          }
        } catch {}
      }

      if (!id && !currentUser.email) return;

      const identifier = id || currentUser.email!;
      const result = await fetchChores(identifier);

      if (!mounted) return;

      const mapped = result.chores.map((c: any) => ({
        ...c,
        dueDay: computeDueDay(c.dueDate),
      }));

      setChores(mapped);
      setDebugInfo({
        identifier,
        count: mapped.length,
        householdName: result.householdName,
      });
    }

    loadChores();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // -----------------------------
  // Toggle Completed State
  // -----------------------------
  async function handleToggle(id: string, next: boolean) {
    const chore = chores.find((c) => c.id === id);
    if (!chore) return;

    setLoading((l) => ({ ...l, [id]: true }));

    try {
      const res = await fetch(
        `http://localhost:3000/api/chores/${encodeURIComponent(id)}/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            completed: next,
          }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.chore) return;

      setChores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data.chore } : c))
      );

      if (data.chore.completed) {
        setConfettiId(id);
        setTimeout(() => setConfettiId(null), 1000);
      }

      if (data.user) onUserUpdate?.(data.user);
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }

  const completed = chores.filter((c) => c.completed).length;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-purple-700 mb-1">Your Chores This Week</h3>
          <p className="text-purple-500 text-sm">
            {completed} of {chores.length} complete • Nice work! 🎉
          </p>

          {debugInfo && (
            <div className="text-xs text-gray-500 mt-2">
              <div>Identifier: {debugInfo.identifier}</div>
              <div>Household: {debugInfo.householdName ?? "(none)"}</div>
              <div>Chores returned: {debugInfo.count}</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {chores.map((chore) => (
          <motion.div
            key={chore.id}
            layout
            className={`relative p-5 rounded-2xl border-2 transition-all ${
              chore.completed
                ? "bg-green-100 border-green-300"
                : chore.dueDay === "Today"
                ? "bg-yellow-100 border-yellow-300"
                : "bg-white/80 border-purple-100"
            }`}
          >
            {confettiId === chore.id && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{
                      scale: 1,
                      x: Math.cos((i * 45 * Math.PI) / 180) * 60,
                      y: Math.sin((i * 45 * Math.PI) / 180) * 60,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.6 }}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Checkbox
                checked={chore.completed}
                onCheckedChange={(v) => handleToggle(chore.id, v === true)}
                className="w-6 h-6 border-purple-300"
              />

              <div>
                <p
                  className={`${
                    chore.completed
                      ? "line-through text-purple-400"
                      : "text-purple-700"
                  }`}
                >
                  {chore.name}
                </p>

                <div className="text-xs mt-1 flex gap-2">
                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-600">
                    {chore.dueDay}
                  </span>
                  <span className="text-purple-500">{chore.points} points</span>
                </div>
              </div>

              {chore.completed && (
                <div className="ml-auto p-2 bg-green-200 rounded-xl">
                  <Check className="w-5 h-5 text-green-700" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {completed === chores.length && chores.length > 0 && (
        <div className="mt-6 rounded-2xl p-6 text-center bg-purple-100 border border-purple-200">
          <p className="text-purple-700 text-lg mb-1">
            🎉 All chores complete!
          </p>
          <p className="text-purple-500 text-sm">You're a chore champion! 💜</p>
        </div>
      )}
    </div>
  );
}
