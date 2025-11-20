import { useState } from "react";
import {
  Trash2,
  Droplets,
  Sparkles,
  Utensils,
  ShoppingCart,
  Scissors,
  WashingMachine,
  Leaf,
  Plus,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../ui/dropdown-menu";
import "../../styles/onboarding.css";

interface ChoresStepProps {
  // changed: emit chores with frequency
  onNext: (chores: { name: string; frequency: string }[]) => void;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Once a day" },
  { value: "weekly", label: "Once a week" },
  { value: "2x_week", label: "Twice a week" },
  { value: "3x_week", label: "Three times a week" },
  { value: "4x_week", label: "Four times a week" },
  { value: "5x_week", label: "Five times a week" },
  { value: "6x_week", label: "Six times a week" },
  { value: "biweekly", label: "Once every two weeks" },
  { value: "monthly", label: "Once a month" },
];

const defaultChores = [
  {
    id: "trash",
    name: "Take Out Trash",
    icon: Trash2,
    color: "--trash-gradient",
  },
  {
    id: "dishes",
    name: "Wash Dishes",
    icon: Droplets,
    color: "--dishes-gradient",
  },
  {
    id: "sweep",
    name: "Sweep/Vacuum",
    icon: Sparkles,
    color: "--sweep-gradient",
  },
  {
    id: "kitchen",
    name: "Clean Kitchen",
    icon: Utensils,
    color: "--kitchen-gradient",
  },
  {
    id: "groceries",
    name: "Buy Groceries",
    icon: ShoppingCart,
    color: "--groceries-gradient",
  },
  {
    id: "bathroom",
    name: "Clean Bathroom",
    icon: Scissors,
    color: "--bathroom-gradient",
  },
  {
    id: "laundry",
    name: "Do Laundry",
    icon: WashingMachine,
    color: "--laundry-gradient",
  },
  {
    id: "plants",
    name: "Water Plants",
    icon: Leaf,
    color: "--plants-gradient",
  },
];

export function ChoresStep({ onNext }: ChoresStepProps) {
  const [selected, setSelected] = useState<string[]>([
    "trash",
    "dishes",
    "sweep",
    "kitchen",
  ]);
  // changed: custom chores store id + name
  const [customChores, setCustomChores] = useState<
    { id: string; name: string }[]
  >([]);
  const [newChore, setNewChore] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // changed: frequencies keyed by chore id
  const [frequencies, setFrequencies] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    // default selected chores default to weekly
    ["trash", "dishes", "sweep", "kitchen"].forEach(
      (id) => (init[id] = "weekly")
    );
    return init;
  });

  const toggleChore = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    // ensure a frequency exists for new selection
    setFrequencies((prev) => (prev[id] ? prev : { ...prev, [id]: "weekly" }));
  };

  const addCustomChore = () => {
    if (newChore.trim()) {
      const id = `custom-${Date.now()}`;
      setCustomChores((prev) => [...prev, { id, name: newChore }]);
      setSelected((prev) => [...prev, id]);
      setFrequencies((prev) => ({ ...prev, [id]: "weekly" }));
      setNewChore("");
      setShowCustomInput(false);
    }
  };

  const handleContinue = () => {
    const selectedSet = new Set(selected);
    const defaultSelected = selected
      .filter((id) => !id.startsWith("custom-"))
      .map((id) => {
        const name = defaultChores.find((c) => c.id === id)?.name || id;
        return { name, frequency: frequencies[id] || "weekly" };
      });

    const customSelected = customChores
      .filter((c) => selectedSet.has(c.id))
      .map((c) => ({ name: c.name, frequency: frequencies[c.id] || "weekly" }));

    onNext([...defaultSelected, ...customSelected]);
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-yellow-200 to-orange-200 p-4 rounded-3xl shadow-lg mb-4">
          <Sparkles className="w-12 h-12 text-purple-600" />
        </div>
        <h2 className="text-purple-700 mb-2">Pick Your Household Chores</h2>
        <p className="text-purple-500">
          Select the chores your household needs to manage
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {defaultChores.map((chore) => {
          const Icon = chore.icon;
          const isSelected = selected.includes(chore.id);

          return (
            <button
              key={chore.id}
              type="button"
              onClick={() => toggleChore(chore.id)}
              style={
                isSelected
                  ? { backgroundImage: `var(${chore.color})` }
                  : undefined
              }
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? `border-purple-400 shadow-lg scale-105`
                  : "bg-white/60 border-purple-200 hover:border-purple-300 hover:shadow-md"
              }`}
            >
              <div
                className={`p-3 rounded-xl inline-flex mb-3 ${
                  isSelected ? "bg-white/80" : "bg-purple-50"
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${
                    isSelected ? "text-purple-600" : "text-purple-400"
                  }`}
                />
              </div>
              <p
                className={`${
                  isSelected ? "text-purple-700" : "text-purple-600"
                }`}
              >
                {chore.name}
              </p>

              {/* frequency selector (now using DropdownMenu) - stop propagation on trigger/items */}
              <div className="mt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="mt-2 w-full text-sm bg-white/80 border border-purple-200 rounded-full px-3 py-1 flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-left">
                      {
                        FREQUENCY_OPTIONS.find(
                          (o) => o.value === (frequencies[chore.id] || "weekly")
                        )?.label
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-purple-400" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent sideOffset={6} className="w-56">
                    <DropdownMenuRadioGroup
                      value={frequencies[chore.id] || "weekly"}
                      onValueChange={(val) =>
                        setFrequencies((prev) => ({ ...prev, [chore.id]: val }))
                      }
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <DropdownMenuRadioItem
                          key={opt.value}
                          value={opt.value}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-2 text-sm"
                        >
                          {opt.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
          );
        })}

        {customChores.map((choreObj) => (
          <div
            key={choreObj.id}
            className="p-6 rounded-2xl border-2 bg-gradient-to-br from-purple-200 to-pink-200 border-purple-400 shadow-lg text-left"
          >
            <div className="p-3 rounded-xl inline-flex mb-3 bg-white/80">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-purple-700">{choreObj.name}</p>

            <div className="mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="mt-2 w-full text-sm bg-white/80 border border-purple-200 rounded-full px-3 py-1 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-left">
                    {
                      FREQUENCY_OPTIONS.find(
                        (o) =>
                          o.value === (frequencies[choreObj.id] || "weekly")
                      )?.label
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-purple-400" />
                </DropdownMenuTrigger>

                <DropdownMenuContent sideOffset={6} className="w-56">
                  <DropdownMenuRadioGroup
                    value={frequencies[choreObj.id] || "weekly"}
                    onValueChange={(val) =>
                      setFrequencies((prev) => ({
                        ...prev,
                        [choreObj.id]: val,
                      }))
                    }
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem
                        key={opt.value}
                        value={opt.value}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 text-sm"
                      >
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="p-6 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/30 hover:bg-purple-50/60 hover:border-purple-400 transition-all"
          >
            <Plus className="w-6 h-6 text-purple-400 mx-auto mb-3" />
            <p className="text-purple-500">Add Custom Chore</p>
          </button>
        ) : (
          <div className="p-6 rounded-2xl border-2 border-purple-300 bg-white/60">
            <Input
              value={newChore}
              onChange={(e) => setNewChore(e.target.value)}
              placeholder="Chore name..."
              className="mb-3 bg-white border-purple-200 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && addCustomChore()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCustomInput(false)}
                className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 rounded-xl text-sm py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={addCustomChore}
                disabled={!newChore.trim()}
                className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-xl text-sm py-2 disabled:opacity-50"
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-yellow-50/50 rounded-2xl p-4 border border-yellow-200 mb-6">
        <p className="text-purple-600 text-sm text-center">
          ✨ Selected {selected.length} chore{selected.length !== 1 ? "s" : ""}{" "}
          • You can always add more later!
        </p>
      </div>

      <Button
        onClick={handleContinue}
        disabled={selected.length === 0}
        className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
