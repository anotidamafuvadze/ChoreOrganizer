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
import ErrorToast from "./components/ui/error-toast";

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
  points?: number;
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
        if (!cancelled) setLoading(false); // ensure loading state cleared on success
      } catch (err) {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
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
        return;
      }

      if (!res.ok) {
        setError("Login error. Please try again.");
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

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/user/logout", {
        method: "POST",
        mode: "cors",
        credentials: "include",
      });
    } catch (e) {
      // ignore network errors; still clear client state
    }

    // Clear client session state and navigate to login screen
    setCurrentUser(null);
    setHousehold("");
    setHouseholdInviteCode(null);
    setScreen("login");
    setActiveView("home");
    setLoading(false);
  };

  const onSignUpClick = () => {
    setScreen("onboarding");
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

      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 404) {
          setError("Household not found. Please check invite code.");
          return;
        } else if (res.status === 409) {
          setError("Email already in use.");
          return;
        } else if (res.status === 500) {
          setError("Server error. Please try again.");
          return;
        } else {
          setError(data?.error || "Failed to save profile. Please try again.");
          return;
        }
      }

      if (!data?.user) {
        setError("Failed to save profile. Please try again.");
        return;
      }

      // Update state with response data
      setCurrentUser(data.user);

      // Handle household data
      let finalInviteCode = inviteCode || null;
      let finalHouseholdName = householdName;
      let finalHouseholdId = data.householdId || null;

      if (inviteCode && data.householdName) {
        finalHouseholdName = data.householdName;
        setHousehold(data.householdName);
      } else if (!inviteCode && data.inviteCode) {
        finalInviteCode = data.inviteCode;
        setHouseholdInviteCode(data.inviteCode);
      }

      // TODO: Display errors in UI

      // If user joined via invite code, finalize household membership
      if (inviteCode && finalHouseholdId) {
        try {
          const finalizeRes = await fetch(
            "http://localhost:3000/api/user/finalize-household",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: merged.id,
                householdId: finalHouseholdId,
              }),
              mode: "cors",
              credentials: "include",
            }
          );

          if (!finalizeRes.ok) {
            console.error("Failed to finalize household membership");
            // Don't block user from proceeding, just log the error
          }
        } catch (error) {
          console.error("Error finalizing household membership:", error);
          // Don't block user from proceeding
        }
      }

      await sendSessionToServer(merged, finalHouseholdName, finalInviteCode);

      setScreen("app");
      setLoading(false);
    } catch (error) {
      setError("Network error. Please check your connection.");
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

  if (screen === "login") {
    return (
      <>
        <ErrorToast message={error} />
        <LoginScreen
          onLoginComplete={handleLoginComplete}
          onSignUpClick={onSignUpClick}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (screen === "onboarding") {
    return (
      <>
        <ErrorToast message={error} />
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-[#FFE8F5] to-[#E6F7FF] pb-24">
      <ErrorToast message={error} />
      <Header
        household={household}
        inviteCode={householdInviteCode}
        onLogout={handleLogout}
      />

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
                inviteCode={householdInviteCode}
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
