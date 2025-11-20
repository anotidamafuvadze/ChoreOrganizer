import { useState } from "react";
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
  const handleLoginComplete = () => {
    setScreen("onboarding");
  };

  // TODO: Replace mock logic with real onboarding completion in backend
  const handleOnboardingComplete = (user: User, householdName: string) => {
    setCurrentUser(user); // TODO: Update in backend/auth context as well
    setHousehold(householdName); // TODO: Update in backend/auth context as well
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
    return <LoginScreen onLoginComplete={handleLoginComplete} />;
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
