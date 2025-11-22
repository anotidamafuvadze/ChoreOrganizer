import { useState } from "react";
import { useEffect } from "react";
import { Home, ListTodo, Calendar, Trophy, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ChoresScreen } from "./components/chores/ChoresScreen";
import { CalendarScreen } from "./components/calendar/CalendarScreen";
import { LeaderboardScreen } from "./components/leaderboard/LeaderboardScreen";
import { SettingsScreen } from "./components/settings/SettingsScreen";

export type Mascot = "frog" | "cat" | "bunny" | "bird" | "fox" | "bear";

export const Mascot = {
  frog: "frog",
  cat: "cat",
  bunny: "bunny",
  bird: "bird",
  fox: "fox",
  bear: "bear",
} as const;

export interface User {
  id: string;
  name: string;
  mascot: Mascot;
  color: string;
  preferences: Record<string, "love" | "neutral" | "avoid">;
}

export interface Chore {
  id: string;
  name: string;
  icon: string;
  frequency: "daily" | "weekly" | "biweekly";
  points: number;
  assignedTo: string;
  dueDate: Date;
  completed: boolean;
}

export default function App() {
  const [screen, setScreen] = useState<"login" | "onboarding" | "app">("login");
  const [activeView, setActiveView] = useState<
    "home" | "chores" | "calendar" | "leaderboard" | "settings"
  >("home");

  // TODO: Replace with real user and household data fetching from backend/auth context
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<string>("Unit 3B Roomies");

  // TODO: Replace mock logic with real authentication
  const handleLoginComplete = (forceOnboarding?: boolean) => {
    if (forceOnboarding) {
      setScreen("onboarding");
      return;
    }
    // When the user explicitly continues from the login screen, determine
    // whether to show onboarding or go to the app. Prefer a backend check
    // (using the Firebase ID token), and fall back to a localStorage per-UID
    // flag when backend is unreachable.
    (async () => {
      try {
        const mod = await import("./firebaseClient");
        const fbAuth = mod && mod.auth ? mod.auth : null;
        const fbUser = fbAuth && fbAuth.currentUser ? fbAuth.currentUser : null;

        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            const res = await fetch("/api/user/me", {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            if (res.ok) {
              const data = await res.json();
              const hasOnboarded =
                !!(
                  data &&
                  data.preferences &&
                  Object.keys(data.preferences).length > 0
                ) || !!data.onboardComplete;
              setScreen(hasOnboarded ? "app" : "onboarding");
              return;
            }
            if (res.status === 404) {
              setScreen("onboarding");
              return;
            }
          } catch (e) {
            // backend check failed; fall back to local flag
          }

          try {
            const key = `onboarded:${fbUser.uid}`;
            const onboarded = localStorage.getItem(key) === "1";
            setScreen(onboarded ? "app" : "onboarding");
            return;
          } catch (e) {
            // ignore localStorage errors
          }
        }
      } catch (e) {
        // firebase client not available, default to onboarding
      }

      setScreen("onboarding");
    })();
  };

  // Listen for Firebase auth changes (if Firebase is configured) and map to our app User
  useEffect(() => {
    let unsub;
    const mod = import("./firebaseClient")
      .then((mod) => {
        if (mod && typeof mod.onAuthChange === "function") {
          unsub = mod.onAuthChange((fbUser) => {
            if (fbUser) {
              const mapped: User = {
                id: fbUser.uid,
                name:
                  fbUser.displayName ||
                  (fbUser.email ? fbUser.email.split("@")[0] : "You"),
                mascot: "cat", // TODO: Retrieve from data base (Anotida)
                color: "#FFB6C1", // TODO: Retrieve from data base (Anotida)
                preferences: {}, // TODO: Retrieve from data base (Anotida)
              };
              setCurrentUser(mapped);
              // Do not auto-navigate here. Keep the login screen visible until the
              // user explicitly continues (handled by `handleLoginComplete`).
            } else {
              setCurrentUser(null);
              setScreen("login");
            }
          });
        }
      })
      .catch((e) => {
        // If import fails (no firebase configured), do nothing.
        // Keep the app usable with mock onboarding flow.
        // console.warn('Firebase auth not available', e)
      });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);
  // TODO: Replace mock logic with real onboarding completion in backend
  const handleOnboardingComplete = (user: User, householdName: string) => {
    // Preserve Firebase-authenticated name/id when present so Google displayName isn't overwritten
    const merged: User = { ...user };
    if (currentUser) {
      if (currentUser.id) merged.id = currentUser.id;
      if (currentUser.name && currentUser.name !== "You")
        merged.name = currentUser.name;
      if (!merged.mascot && currentUser.mascot)
        merged.mascot = currentUser.mascot;
      if (!merged.color && currentUser.color) merged.color = currentUser.color;
    }

    setCurrentUser(merged); // TODO: Update in backend/auth context as well
    setHousehold(householdName); // TODO: Update in backend/auth context as well
    // Mark this uid as onboarded locally; backend persistence can be added later
    try {
      localStorage.setItem(`onboarded:${merged.id}`, "1");
    } catch (e) {
      // ignore
    }
    setScreen("app");
  };

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "chores" as const, label: "Chores", icon: ListTodo },
    {
      id: "calendar" as const,
      label: "Calendar",
      icon: Calendar,
    },
    { id: "leaderboard" as const, label: "MVP", icon: Trophy },
    {
      id: "settings" as const,
      label: "Profile",
      icon: Settings,
    },
  ];

  if (screen === "login") {
    return (
      <LoginScreen
        onLoginComplete={handleLoginComplete}
        currentUser={currentUser}
      />
    );
  }

  if (screen === "onboarding") {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-[#FFE8F5] to-[#E6F7FF] pb-24">
      <Header household={household} />

      <main className="max-w-7xl mx-auto px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === "home" && <Dashboard currentUser={currentUser!} />}
            {activeView === "chores" && <ChoresScreen />}
            {activeView === "calendar" && <CalendarScreen />}
            {activeView === "leaderboard" && <LeaderboardScreen />}
            {activeView === "settings" && (
              <SettingsScreen
                currentUser={currentUser!}
                household={household}
                onUpdateUser={(u) => setCurrentUser(u)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Navigation
        items={navItems}
        activeView={activeView}
        onNavigate={setActiveView}
      />
    </div>
  );
}
