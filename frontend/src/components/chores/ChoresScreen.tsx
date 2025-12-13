import { useState, useEffect } from "react";
import {
  Plus,
  Heart,
  Meh,
  X,
  Trash2,
  Droplets,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { Mascot } from "../../App";
import { useUser } from "../../contexts/UserContext";

// TODO: Replace the chore list with real data fetching from backend on the ChoresScreen
const choresList = [
  {
    id: "1",
    name: "Take Out Trash",
    icon: Trash2,
    frequency: "Weekly",
    assignedTo: "You",
    color: "#FFB6C1",
  },
  {
    id: "2",
    name: "Wash Dishes",
    icon: Droplets,
    frequency: "Daily",
    assignedTo: "Alex",
    color: "#A7C7E7",
  },
  {
    id: "3",
    name: "Sweep Living Room",
    icon: Sparkles,
    frequency: "Weekly",
    assignedTo: "Jamie",
    color: "#E6B8FF",
  },
  {
    id: "4",
    name: "Clean Kitchen",
    icon: Utensils,
    frequency: "Biweekly",
    assignedTo: "Sam",
    color: "#FFDAB9",
  },
];

const nextWeekRotation = [
  {
    choreName: "Take Out Trash",
    points: 10,
    assignedTo: { name: "Alex", mascot: "bunny" as Mascot, color: "#A7C7E7" },
  },
  {
    choreName: "Wash Dishes",
    points: 15,
    assignedTo: { name: "You", mascot: "cat" as Mascot, color: "#FFB6C1" },
  },
];

// TODO: Replace the preference stats with real data fetching from backend on the ChoresScreen
const preferenceStats = {
  "Take Out Trash": { love: 1, neutral: 2, avoid: 1 },
  "Wash Dishes": { love: 0, neutral: 3, avoid: 1 },
  "Sweep Living Room": { love: 2, neutral: 1, avoid: 1 },
  "Clean Kitchen": { love: 1, neutral: 2, avoid: 1 },
};

// TODO: Implement edit chore functionality
const handleEditChore = (choreId: string) => {};

// addChore now implemented as a styled dialog inside the component

// TODO: Implement preference update functionality
const updatePreference = (
  choreId: string,
  preference: "love" | "neutral" | "avoid"
) => {};

export function ChoresScreen() {
  const [selectedChore, setSelectedChore] = useState<string | null>(null);
  // new state to hold household chores and whether templates exist
  const [householdChores, setHouseholdChores] = useState<any[] | null>(null);
  const [hasTemplates, setHasTemplates] = useState<boolean>(false);
  const [pendingTemplates, setPendingTemplates] = useState<any[] | null>(null);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(
    null
  );
  const [roommates, setRoommates] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignedOnce, setAssignedOnce] = useState<boolean>(false);

  // add-chore dialog state
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newPoints, setNewPoints] = useState<number>(5);
  const [newFrequency, setNewFrequency] = useState<string>("Weekly");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const user = useUser();

  // Build the list of chores to show in the Preferences panel.
  const preferenceChores = (() => {
    const active = Array.isArray(householdChores) ? householdChores : [];
    const pending = Array.isArray(pendingTemplates) ? pendingTemplates : [];
    const combined = [...active, ...pending];
    const map = new Map<string, any>();
    for (const c of combined) {
      if (!c) continue;
      const name = String(c.name || c.choreName || c.title || "").trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, c);
    }
    if (map.size === 0) return choresList;
    return Array.from(map.values());
  })();

  function formatFrequency(raw: any) {
    if (!raw) return "";
    const s = String(raw);
    // match patterns like '5x_week' or '3x_month'
    const m = s.match(/^(\d+)x_?(week|month|day)s?$/i);
    if (m) {
      const n = m[1];
      const unit = m[2].toLowerCase();
      const unitText =
        unit === "week"
          ? "week"
          : unit === "month"
          ? "month"
          : unit === "day"
          ? "day"
          : unit;
      return `${n}× a ${unitText}`;
    }
    // common normalized values
    if (/^daily$/i.test(s)) return "Daily";
    if (/^weekly$/i.test(s)) return "Weekly";
    if (/^biweekly$/i.test(s)) return "Biweekly";
    if (/^monthly$/i.test(s)) return "Monthly";
    return s;
  }

  // try to read householdId from local session cache (keeps parity with other components)
  function getLocalHouseholdId() {
    try {
      const cached = JSON.parse(localStorage.getItem("session:user") || "null");
      return cached?.householdId ?? null;
    } catch {
      return null;
    }
  }

  async function fetchHousehold(householdId: string | null) {
    if (!householdId) return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/household/${encodeURIComponent(
          householdId
        )}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      // record the household id we loaded so submits can use it
      setCurrentHouseholdId(householdId);
      // chores returned may be active chores or templates (if active empty)
      const chores = Array.isArray(data.chores) ? data.chores : [];
      setHouseholdChores(chores);
      // store roommates for name lookup
      const rms = Array.isArray((data as any).roommates)
        ? (data as any).roommates
        : [];
      setRoommates(rms);
      // store pending templates explicitly so UI can render them
      const pendingArr = Array.isArray((data as any).pendingChoreTemplates)
        ? (data as any).pendingChoreTemplates
        : [];
      setPendingTemplates(pendingArr);
      const pending = pendingArr.length > 0;
      setHasTemplates(
        pending ||
          (chores.length === 0 && (data.chores || []).length === 0 && pending)
      );
      // track whether this household has ever had assignments run
      try {
        const key = householdId
          ? `household:${householdId}:assignedOnce`
          : null;
        const stored = key ? localStorage.getItem(key) === "true" : false;
        if ((chores || []).length > 0) {
          if (key) localStorage.setItem(key, "true");
          setAssignedOnce(true);
        } else {
          setAssignedOnce(stored);
        }
      } catch {
        // ignore localStorage errors
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // Init: prefer local cache, otherwise resolve session from backend and fetch household
    const init = async () => {
      let hhId = getLocalHouseholdId();
      if (!hhId) {
        try {
          const s = await fetch("http://localhost:3000/api/session", {
            credentials: "include",
          });
          if (s.ok) {
            const sd = await s.json();
            hhId = sd?.user?.householdId ?? null;
            setCurrentUserId(sd?.user?.id ?? sd?.user?.uid ?? null);
          }
        } catch (e) {
          // ignore
        }
      }
      if (hhId) fetchHousehold(hhId);
    };

    init();

    const handler = () => fetchHousehold(getLocalHouseholdId());
    window.addEventListener("household:updated", handler);
    return () => window.removeEventListener("household:updated", handler);
  }, []);

  async function handleAssign() {
    // Resolve household id (prefer currently loaded id)
    const hhId = currentHouseholdId || getLocalHouseholdId();
    if (!hhId) return;
    setAssigning(true);
    try {
      // If there are pending templates, promote them to active chores first
      const hasPending =
        Array.isArray(pendingTemplates) && pendingTemplates.length > 0;
      if (hasPending) {
        try {
          const pRes = await fetch(
            `http://localhost:3000/api/household/${encodeURIComponent(
              hhId
            )}/promote-templates`,
            { method: "POST", credentials: "include" }
          );
          if (pRes.ok) {
            await fetchHousehold(hhId);
          }
        } catch (e) {
          // ignore promotion errors and continue to assignment
        }
      }
      // compute unassigned active chores
      const active = Array.isArray(householdChores) ? householdChores : [];
      const unassigned = active.filter(
        (c: any) =>
          !c.assignedTo ||
          (Array.isArray(c.assignedTo) && c.assignedTo.length === 0)
      );

      // ensure we have roommates to assign to
      let members = Array.isArray(roommates)
        ? roommates.map((r) => String(r.id))
        : [];
      if (members.length === 0) {
        // try fetching roommates from backend
        try {
          const rmRes = await fetch(
            `http://localhost:3000/api/household/${encodeURIComponent(
              hhId
            )}/roommates`,
            { credentials: "include" }
          );
          if (rmRes.ok) {
            const jd = await rmRes.json();
            members = Array.isArray(jd.roommates)
              ? jd.roommates.map((r: any) => String(r.id))
              : [];
          }
        } catch (e) {
          // ignore
        }
      }

      if (unassigned.length > 0 && members.length > 0) {
        // Build random assignments for each unassigned chore
        const assignments = unassigned.map((c: any) => {
          const uid = members[Math.floor(Math.random() * members.length)];
          return { choreId: String(c.id), userId: String(uid) };
        });

        // POST manual reassign with assignments array
        try {
          const res = await fetch(
            `http://localhost:3000/api/household/${encodeURIComponent(
              hhId
            )}/reassign`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assignments }),
            }
          );

          if (res.ok) {
            // optimistic update: apply assignments locally so UI reflects changes immediately
            try {
              const updated = (assignments || []).reduce(
                (acc: any[], a: any) => {
                  return acc.map((c: any) =>
                    String(c.id) === String(a.choreId)
                      ? { ...c, assignedTo: String(a.userId) }
                      : c
                  );
                },
                Array.isArray(householdChores) ? householdChores : []
              );
              setHouseholdChores(updated);
            } catch (e) {
              // ignore local update errors
            }

            try {
              localStorage.setItem(`household:${hhId}:assignedOnce`, "true");
            } catch {}
            setAssignedOnce(true);
            // refresh from server to ensure canonical state
            await fetchHousehold(hhId);
            return;
          }
        } catch (e) {
          // fall back to optimization if manual fails
        }
      }

      // Fallback: call optimization assign endpoint
      try {
        const res2 = await fetch(
          `http://localhost:3000/api/household/${encodeURIComponent(
            hhId
          )}/assign`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (res2.ok) {
          try {
            localStorage.setItem(`household:${hhId}:assignedOnce`, "true");
          } catch {}
          setAssignedOnce(true);
          await fetchHousehold(hhId);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    } finally {
      setAssigning(false);
    }
  }

  async function submitNewChoreTemplate() {
    // Prefer in-memory UserContext householdId first
    let hhId = user && user.householdId ? String(user.householdId) : null;
    // Next prefer currently loaded household in this view
    if (!hhId && currentHouseholdId) hhId = currentHouseholdId;
    // Next try local cache
    if (!hhId) hhId = getLocalHouseholdId();
    // Fallback: try session endpoint used by UserProvider
    if (!hhId) {
      try {
        const s = await fetch("/api/session", { credentials: "include" });
        if (s.ok) {
          const sd = await s.json();
          hhId = sd?.user?.householdId ?? null;
        }
      } catch (e) {
        // ignore
      }
    }
    if (!hhId) {
      alert("No household found in session");
      return;
    }
    if (!newName || !newName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/household/${encodeURIComponent(
          hhId
        )}/pending-template`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            frequency: newFrequency,
            points: newPoints,
          }),
        }
      );
      if (res.ok) {
        const jd = await res.json();
        const created = jd?.template ?? null;
        if (created) {
          setPendingTemplates((p) => (p ? [created, ...p] : [created]));
        }
        await fetchHousehold(hhId);
        setAddOpen(false);
        setNewName("");
        setNewPoints(5);
        setNewFrequency("Weekly");
      } else {
        // optionally show error
      }
    } catch (e) {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-700 mb-2">Household Chores</h2>
          <p className="text-purple-500">
            Manage chores, preferences, and rotations for your household ✨
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Chore
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-r from-white/60 to-pink-50 backdrop-blur-sm rounded-2xl p-6 border border-purple-100/50 shadow-md shadow-black/10">
              <DialogHeader>
                <DialogTitle>Add Chore</DialogTitle>
                <DialogDescription>
                  Create an unassigned chore for your household.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <label className="text-sm text-purple-700">Name</label>
                <Input
                  className="rounded-2xl"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Take out trash"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-purple-700">Points</label>
                    <Input
                      className="rounded-2xl"
                      type="number"
                      value={String(newPoints)}
                      onChange={(e) =>
                        setNewPoints(Number(e.target.value || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-purple-700">Frequency</label>
                    <Select
                      value={newFrequency}
                      onValueChange={(v: string) => setNewFrequency(v)}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-sm rounded-2xl border border-purple-100/50 shadow-md">
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Biweekly">Biweekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-2xl">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={submitNewChoreTemplate}
                  disabled={submitting}
                  className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg"
                >
                  {submitting ? "Creating..." : "Create Chore"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {assignedOnce && (
            <Button
              onClick={handleAssign}
              disabled={assigning}
              className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg"
            >
              {assigning ? "Assigning..." : "Assign Chores"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chore List */}
        <div className="col-span-2 bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
          <h3 className="text-purple-700 mb-4">All Chores</h3>

          {/* Show assign button if no active chores but templates exist */}
          {householdChores && householdChores.length === 0 && hasTemplates ? (
            <div className="flex flex-col items-center justify-center p-8">
              <p className="text-purple-600 mb-4">
                Chores are ready to be assigned for your household.
              </p>
              <Button
                onClick={handleAssign}
                disabled={assigning}
                className="bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-2xl"
              >
                {assigning ? "Assigning..." : "Assign Chores Now"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Merge active chores and pending templates into Unassigned and Assigned sections */}
              {(() => {
                const active = Array.isArray(householdChores)
                  ? householdChores
                  : [];
                const pending = Array.isArray(pendingTemplates)
                  ? pendingTemplates
                  : [];

                // Items with no assignedTo are unassigned (include pending templates)
                const activeUnassigned = active.filter(
                  (c: any) =>
                    !c.assignedTo ||
                    (Array.isArray(c.assignedTo) && c.assignedTo.length === 0)
                );
                const activeAssigned = active.filter(
                  (c: any) =>
                    c.assignedTo &&
                    (!Array.isArray(c.assignedTo) || c.assignedTo.length > 0)
                );

                const unassignedDisplay = [...pending, ...activeUnassigned];
                const assignedDisplay = activeAssigned;

                // fallback sample list when nothing loaded
                if (!unassignedDisplay.length && !assignedDisplay.length) {
                  return choresList.map((chore: any) => (
                    <div key={chore.id}>
                      {/* fallback item rendered elsewhere */}
                    </div>
                  ));
                }

                function renderChoreItem(chore: any) {
                  const Icon = (chore.icon as any) || Trash2;
                  const isSelected = selectedChore === chore.id;
                  const assignedRaw = chore.assignedTo;
                  let assignedLabel = "—";
                  if (assignedRaw) {
                    if (typeof assignedRaw === "string") {
                      const rm = roommates.find(
                        (r) => String(r.id) === String(assignedRaw)
                      );
                      if (String(assignedRaw) === String(currentUserId))
                        assignedLabel = "You";
                      else if (rm)
                        assignedLabel = rm.name ?? String(assignedRaw);
                      else assignedLabel = String(assignedRaw);
                    } else if (
                      typeof assignedRaw === "object" &&
                      assignedRaw.name
                    ) {
                      assignedLabel = assignedRaw.name;
                    } else {
                      assignedLabel = String(assignedRaw);
                    }
                  }

                  return (
                    <button
                      key={chore.id}
                      onClick={() => setSelectedChore(chore.id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300 shadow-md"
                          : "bg-white/80 border-purple-100 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-purple-50 p-3 rounded-xl">
                            <Icon className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-purple-700">{chore.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                                {formatFrequency(
                                  chore.frequency ?? chore.frequency
                                )}
                              </span>
                              <span className="text-xs text-purple-500">
                                {assignedLabel && assignedLabel !== "—"
                                  ? `Assigned to ${assignedLabel}`
                                  : chore.createdAt
                                  ? "Unassigned"
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                            onClick={() => handleEditChore(chore.id)}
                          >
                            <svg
                              className="w-4 h-4 text-purple-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                }

                const rendered: any[] = [];
                if (assignedDisplay.length) {
                  rendered.push(
                    <div key="assigned-section">
                      <h4 className="text-purple-700 font-semibold mb-3">
                        Assigned Chores
                      </h4>
                      <div className="space-y-3">
                        {assignedDisplay.map((c: any) => renderChoreItem(c))}
                      </div>
                    </div>
                  );
                }

                if (unassignedDisplay.length) {
                  rendered.push(
                    <div key="unassigned-section">
                      <h4 className="text-purple-700 font-semibold mb-3">
                        Unassigned Chores
                      </h4>
                      <div className="space-y-3">
                        {unassignedDisplay.map((c: any) => renderChoreItem(c))}
                      </div>
                      <div className="my-4" />
                    </div>
                  );
                }

                return rendered;
              })()}
            </div>
          )}
        </div>

        {/* Preference Panel */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
            <h3 className="text-purple-700 mb-4">Your Preferences</h3>
            <div className="space-y-4">
              {preferenceChores.map((chore: any, idx: number) => (
                <div
                  key={chore.id ?? chore.name ?? `pref-${idx}`}
                  className="bg-white/60 rounded-xl p-3 border border-purple-100"
                >
                  <p className="text-purple-700 text-sm mb-2">
                    {chore.name || chore.choreName || "Unnamed Chore"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 p-2 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
                      onClick={() =>
                        updatePreference(chore.id ?? chore.name, "love")
                      }
                    >
                      <Heart className="w-4 h-4 text-pink-400 mx-auto" />
                    </button>
                    <button
                      className="flex-1 p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                      onClick={() =>
                        updatePreference(chore.id ?? chore.name, "neutral")
                      }
                    >
                      <Meh className="w-4 h-4 text-yellow-400 mx-auto" />
                    </button>
                    <button
                      className="flex-1 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() =>
                        updatePreference(chore.id ?? chore.name, "avoid")
                      }
                    >
                      <X className="w-4 h-4 text-gray-400 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rotation Preview */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
            <h3 className="text-purple-700 mb-4">Next Week's Rotation</h3>
            <div className="space-y-3">
              {nextWeekRotation.map((rot, idx) => (
                <div
                  key={`${rot.choreName}-${idx}`}
                  className={`rounded-xl p-4 border border-purple-100 ${
                    idx === 0
                      ? "bg-gradient-to-r from-yellow-50 to-pink-50"
                      : "bg-gradient-to-r from-blue-50 to-purple-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 text-sm">
                      {rot.choreName}
                    </span>
                    <span className="text-purple-600 text-xs">
                      {rot.points} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MascotIllustration
                      mascot={rot.assignedTo.mascot}
                      color={rot.assignedTo.color}
                      size={25}
                    />
                    <span className="text-purple-600 text-sm">
                      {rot.assignedTo.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* <Button className="w-full mt-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-xl text-sm">
              Preview All Assignments
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
