import { useState, useEffect } from "react";
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

// Types
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
  pronouns: string;
  mascot: Mascot;
  color: string;
  preferences: Record<string, "love" | "neutral" | "avoid">;
  chores?: Record<string, Chore>;
  email?: string;
  password?: string;
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
  // State management
  const [screen, setScreen] = useState<"login" | "onboarding" | "app">("login");
  const [activeView, setActiveView] = useState<
    "home" | "chores" | "calendar" | "leaderboard" | "settings"
  >("home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<string>("Unit 3B Roomies");
  const [householdInviteCode, setHouseholdInviteCode] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Send session data to server
  const sendSessionToServer = async (
    user: User | null,
    householdName?: string | null,
    inviteCode?: string | null
  ) => {
    try {
      await fetch("http://localhost:3000/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          householdName: householdName ?? null,
          inviteCode: inviteCode ?? null,
        }),
        mode: "cors",
        credentials: "include",
      });
    } catch (error) {
      // Ignore network errors for session saving
    }
  };

  // Restore session from server cookies on initial load
  useEffect(() => {
    let cancelled = false;

    // TODO: Ensure logged out users don't trigger session restore  
    // const params = new URLSearchParams(window.location.search);
    // if (params.get("logged_out")) {
    //   const clean = window.location.pathname + window.location.hash;
    //   window.history.replaceState({}, "", clean);
    //   setLoading(false);
    //   setScreen("login");
    //   return;
    // }

    const restoreSession = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/session", {
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data?.user || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }

        setCurrentUser(data.user);
        if (data.householdName) setHousehold(data.householdName);
        if (data.inviteCode) setHouseholdInviteCode(data.inviteCode);
        setScreen("app");
      } catch (error) {
        // Ignore network errors during session restoration
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle login completion
  type LoginUserResponse = {
    user: User;
    inviteCode: string;
    householdId: string;
    householdName: string;
  };

  const handleLoginComplete = async (email?: string, password?: string) => {
    setError(null);

    // Email/password login
    if (email && password) {
      try {
        const res = await fetch("http://localhost:3000/api/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          mode: "cors",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.user) {
          setError("Login failed. Please check your credentials.");
          setScreen("onboarding");
          return;
        }

        setCurrentUser(data.user);
        setHousehold(data.householdName);
        setHouseholdInviteCode(data?.inviteCode ?? null);
        await sendSessionToServer(
          data.user,
          data.householdName,
          data?.inviteCode ?? null
        );
        setScreen("app");
        setLoading(false);
        return;
      } catch (error) {
        setError("Network error. Please check your connection.");
        setScreen("onboarding");
        return;
      }
    }

    // Google (Firebase) login
    try {
      const mod = await import("./firebaseClient");
      const fbAuth = mod?.auth ?? null;
      const fbUser = fbAuth?.currentUser ?? null;

      if (!fbUser || !fbUser.email) {
        setError("Google login failed. Please try again.");
        setScreen("onboarding");
        return;
      }

      const res = await fetch("http://localhost:3000/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fbUser.email,
          authProvider: "google",
        }),
        mode: "cors",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (res.status === 404 || !data?.user) {
        setError("Account not found. Please sign up first.");
        setScreen("onboarding");
        return;
      }

      if (!res.ok) {
        setError("Login error. Please try again.");
        setScreen("onboarding");
        return;
      }

      setCurrentUser(data.user);
      setHousehold(data.householdName);
      setHouseholdInviteCode(data?.inviteCode ?? null);
      await sendSessionToServer(
        data.user,
        data.householdName,
        data?.inviteCode ?? null
      );
      setScreen("app");
      setLoading(false);
    } catch (error) {
      setError("Google login failed. Please try again.");
      setScreen("onboarding");
    }
  };

  const handleOnboardingComplete = async (
    user: User,
    householdName: string,
    chores: { name: string; frequency: string }[],
    inviteCode?: string
  ) => {
    setError(null);
    const merged: User = { ...user };

    // Merge with existing user data
    if (currentUser) {
      if (currentUser.id) merged.id = currentUser.id;
      if (currentUser.name && currentUser.name !== "You")
        merged.name = currentUser.name;
      if (!merged.mascot && currentUser.mascot)
        merged.mascot = currentUser.mascot;
      if (!merged.color && currentUser.color) merged.color = currentUser.color;
    }

    setCurrentUser(merged);
    setHousehold(householdName);

    try {
      const payload: any = {
        user: {
          id: merged.id,
          name: merged.name,
          bday: (merged as any).bday,
          mascot: merged.mascot,
          color: merged.color,
          preferences: merged.preferences,
          chores: chores && chores.length ? chores : merged.chores,
          email: merged.email,
          password: merged.password,
        },
      };

      if (inviteCode) {
        payload.inviteCode = inviteCode;
      } else {
        payload.householdName = householdName;
      }

      const res = await fetch("http://localhost:3000/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.user) {
        setError("Failed to save profile. Please try again.");
      } else {
        try {
          if (inviteCode) {
            if (data.householdName) setHousehold(data.householdName);
          } else if (data.inviteCode) {
            const inviteCodeCreated = data.inviteCode;
            setHouseholdInviteCode(inviteCodeCreated);
            await sendSessionToServer(merged, householdName, inviteCodeCreated);
          }
        } catch (error) {
          setError("Error processing household data.");
        }
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setScreen("app");
      setLoading(false);
    }
  };

  // Navigation configuration
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "chores" as const, label: "Chores", icon: ListTodo },
    { id: "calendar" as const, label: "Calendar", icon: Calendar },
    { id: "leaderboard" as const, label: "MVP", icon: Trophy },
    { id: "settings" as const, label: "Profile", icon: Settings },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF9E6] via-[#FFE8F5] to-[#E6F7FF]">
        <div aria-live="polite" className="text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  // Render screens based on current state
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
      {/* Error Toast Notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-sm font-medium">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header household={household} inviteCode={householdInviteCode} />

      <main className="max-w-7xl mx-auto px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === "home" && (
              <Dashboard
                currentUser={currentUser!}
                onUserUpdate={(u) => setCurrentUser(u)}
              />
            )}
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
