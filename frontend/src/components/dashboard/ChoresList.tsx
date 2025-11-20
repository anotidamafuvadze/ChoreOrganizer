import { useState } from "react";
import { Trash2, Droplets, Sparkles, Utensils, Check } from "lucide-react";
import { motion } from "motion/react";
import { User } from "../../App";
import { Checkbox } from "../ui/checkbox";

interface ChoresListProps {
  currentUser: User;
}

// TODO: Replace with real chores fetching from backend and update user points accordingly
const mockChores = [
  {
    id: "1",
    name: "Take Out Trash",
    icon: Trash2,
    dueDay: "Today",
    points: 10,
    completed: false,
  },
  {
    id: "2",
    name: "Wash Dishes",
    icon: Droplets,
    dueDay: "Tomorrow",
    points: 15,
    completed: false,
  },
  {
    id: "3",
    name: "Sweep Living Room",
    icon: Sparkles,
    dueDay: "Wednesday",
    points: 12,
    completed: false,
  },
  {
    id: "4",
    name: "Clean Kitchen",
    icon: Utensils,
    dueDay: "Friday",
    points: 20,
    completed: false,
  },
];

export function ChoresList({ currentUser }: ChoresListProps) {
  const [chores, setChores] = useState(mockChores);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);

  // changed: allow toggling both ways and accept optional nextState
  const handleToggleChore = (id: string, nextState?: boolean) => {
    const chore = chores.find((c) => c.id === id);
    if (!chore) return;

    const newCompleted =
      typeof nextState === "boolean" ? nextState : !chore.completed;

    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: newCompleted } : c))
    );

    if (newCompleted) {
      setShowConfetti(id);
      setTimeout(() => setShowConfetti(null), 1000);
    } else {
      // if user unchecks, remove confetti and restore UI
      setShowConfetti(null);
    }
  };

  const completedCount = chores.filter((c) => c.completed).length;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-purple-700 mb-1">Your Chores This Week</h3>
          <p className="text-purple-500 text-sm">
            {completedCount} of {chores.length} complete • Nice work! 🎉
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {chores.map((chore) => {
          const Icon = chore.icon;
          const isDueToday = chore.dueDay === "Today";
          const isDueTomorrow = chore.dueDay === "Tomorrow";

          return (
            <motion.div
              key={chore.id}
              layout
              className={`relative p-5 rounded-2xl border-2 transition-all ${
                chore.completed
                  ? "bg-gradient-to-r from-green-100 to-teal-100 border-green-300"
                  : isDueToday
                  ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300"
                  : "bg-white/80 border-purple-100 hover:border-purple-200"
                  // TODO: Add a different style for overdue chores
              }`}
            >
              {showConfetti === chore.id && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
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
                      style={{ rotate: `${i * 45}deg` }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Checkbox
                  checked={chore.completed}
                  // changed: pass the checked value so user can uncheck as well
                  onCheckedChange={(checked) =>
                    handleToggleChore(chore.id, checked === true)
                  }
                  className="w-6 h-6 border-purple-300 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-400 data-[state=checked]:to-pink-400"
                />

                <div
                  className={`p-3 rounded-xl ${
                    chore.completed
                      ? "bg-white/80"
                      : isDueToday
                      ? "bg-white/80"
                      : "bg-purple-50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      chore.completed
                        ? "text-green-600"
                        : isDueToday
                        ? "text-orange-600"
                        : "text-purple-500"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <p
                    className={`${
                      chore.completed
                        ? "line-through text-purple-400"
                        : "text-purple-700"
                    }`}
                  >
                    {chore.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        chore.completed
                          ? "bg-green-200 text-green-700"
                          : isDueToday
                          ? "bg-orange-200 text-orange-700"
                          : isDueTomorrow
                          ? "bg-yellow-200 text-yellow-700"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      {chore.dueDay}
                    </span>
                    <span className="text-xs text-purple-500">
                      {chore.points} points
                    </span>
                  </div>
                </div>

                {chore.completed && (
                  <div className="bg-gradient-to-br from-green-300 to-teal-300 p-2 rounded-xl">
                    <Check className="w-5 h-5 text-green-700" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {completedCount === chores.length && chores.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 text-center border border-purple-200">
          <p className="text-purple-700 text-lg mb-1">
            🎉 All chores complete! 🎉
          </p>
          <p className="text-purple-500 text-sm">
            You're a chore champion! Your household thanks you! 💜
          </p>
        </div>
      )}
    </div>
  );
}
