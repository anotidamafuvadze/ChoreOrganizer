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

// Calculate the actual due date based on frequency and last completion
function calculateActualDueDate(chore: any): Date | null {
  const frequency = chore.frequency || "weekly";
  const lastCompletedAt = chore.lastCompletedAt;

  // If chore was completed before, calculate next due date from last completion
  if (lastCompletedAt) {
    const lastCompleted = new Date(lastCompletedAt);
    const nextDue = new Date(lastCompleted);

    if (frequency === "daily") {
      nextDue.setDate(nextDue.getDate() + 1);
    } else if (frequency === "weekly") {
      nextDue.setDate(nextDue.getDate() + 7);
    } else if (frequency === "biweekly") {
      nextDue.setDate(nextDue.getDate() + 14);
    } else {
      nextDue.setDate(nextDue.getDate() + 7); // default to weekly
    }

    console.log(`[${chore.name}] Calculated from lastCompletedAt:`, {
      lastCompletedAt,
      frequency,
      nextDue: nextDue.toISOString(),
      completed: chore.completed,
    });
    return nextDue;
  }

  // If never completed, chore is overdue based on frequency from today
  // Calculate backwards: if it's weekly and today is Friday, it should have been done by last week
  const today = new Date();
  const daysSinceCreation = chore.dueDate
    ? Math.floor(
        (today.getTime() - new Date(chore.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  let frequencyDays = 7; // default weekly
  if (frequency === "daily") frequencyDays = 1;
  else if (frequency === "biweekly") frequencyDays = 14;

  // If the chore has existed longer than its frequency, it's overdue
  // Set the due date to when it should have been completed
  const shouldHaveBeenDue = new Date(chore.dueDate || today);

  console.log(`[${chore.name}] Never completed:`, {
    dueDate: chore.dueDate,
    frequency,
    frequencyDays,
    daysSinceCreation,
    shouldHaveBeenDue: shouldHaveBeenDue.toISOString(),
    completed: chore.completed,
  });

  return shouldHaveBeenDue;
}

function computeDueDay(chore: any) {
  const actualDueDate = calculateActualDueDate(chore);
  if (!actualDueDate) return "";

  const dueDay = new Date(actualDueDate);
  dueDay.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) {
    // If completed, show the actual day name instead of "Overdue"
    if (chore.completed) {
      return actualDueDate.toLocaleDateString(undefined, { weekday: "long" });
    }
    return "Overdue";
  }

  return actualDueDate.toLocaleDateString(undefined, { weekday: "long" });
}

function isOverdue(chore: any) {
  const actualDueDate = calculateActualDueDate(chore);
  if (!actualDueDate) return false;

  const dueDay = new Date(actualDueDate);
  dueDay.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const result = diff < 0;

  console.log(`[${chore.name}] Overdue check:`, {
    dueDate: dueDay.toISOString(),
    today: today.toISOString(),
    diff,
    isOverdue: result,
    completed: chore.completed,
  });

  return result;
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

      console.log("Raw chores from API:", result.chores);

      const mapped = result.chores.map((c: any) => {
        console.log(`Processing chore [${c.name}]:`, {
          dueDate: c.dueDate,
          lastCompletedAt: c.lastCompletedAt,
          frequency: c.frequency,
          completed: c.completed,
        });

        return {
          ...c,
          dueDay: computeDueDay(c),
          isOverdue: isOverdue(c),
        };
      });

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
                : chore.isOverdue && !chore.completed
                ? "bg-gradient-to-r from-red-100 to-orange-100 border-red-400 shadow-md"
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
                  <span
                    className={`px-2 py-1 rounded-full ${
                      chore.isOverdue && !chore.completed
                        ? "bg-red-200 text-red-800 font-semibold"
                        : chore.dueDay === "Today"
                        ? "bg-orange-200 text-orange-700"
                        : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    {chore.isOverdue && !chore.completed && "⚠️ "}
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
