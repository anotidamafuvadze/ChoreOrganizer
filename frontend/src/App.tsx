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

    (async () => {
      try {
        const mod = await import("./firebaseClient");
        const fbAuth = mod && mod.auth ? mod.auth : null;
        const fbUser = fbAuth && fbAuth.currentUser ? fbAuth.currentUser : null;

        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            const res = await fetch("http://localhost:3000/api/user/me", {
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

  // helper: normalize chores coming from backend (array or object) and parse dueDate -> Date
  function normalizeChores(raw: any): Record<string, Chore> {
    if (!raw) return {};
    const out: Record<string, Chore> = {};
    if (Array.isArray(raw)) {
      raw.forEach((c: any) => {
        out[c.id] = {
          id: c.id,
          name: c.name,
          icon: c.icon,
          frequency: c.frequency,
          points: c.points,
          assignedTo: c.assignedTo,
          dueDate: c.dueDate
            ? new Date(c.dueDate)
            : c.dueDate === null
            ? (null as any)
            : new Date(),
          completed: !!c.completed,
        } as Chore;
      });
      return out;
    }
    // object/map form
    Object.entries(raw).forEach(([k, v]: any) => {
      const c = v as any;
      out[k] = {
        id: c.id || k,
        name: c.name,
        icon: c.icon,
        frequency: c.frequency,
        points: c.points,
        assignedTo: c.assignedTo,
        dueDate: c.dueDate
          ? new Date(c.dueDate)
          : c.dueDate === null
          ? (null as any)
          : new Date(),
        completed: !!c.completed,
      } as Chore;
    });
    return out;
  }

  // Small helper to print curl examples and quick Firestore inspection hints to the console
  function printCurlExamples(exampleEmail?: string, exampleUid?: string) {
    const backendOrigin =
      (window as any).__BACKEND_URL || "http://localhost:3000";
    const email = exampleEmail || "you@example.com";
    const uid = exampleUid || "<user-id>";

    console.log(
      "=== Quick curl examples to inspect your backend / Firestore ==="
    );
    console.log(
      `GET user by email:\n  curl "${backendOrigin}/api/user/me?email=${encodeURIComponent(
        email
      )}" -v`
    );
    console.log(
      `GET user by uid:\n  curl "${backendOrigin}/api/user/me?uid=${encodeURIComponent(
        uid
      )}" -v`
    );
    console.log(
      `POST create/merge user (sample):\n  curl -X POST "${backendOrigin}/api/user" -H "Content-Type: application/json" -d '${JSON.stringify(
        { user: { email, name: "Your Name" } },
        null,
        2
      )}' -v`
    );
    console.log(
      `Backend debug endpoint:\n  curl "${backendOrigin}/api/registerUsers/__debug?email=${encodeURIComponent(
        email
      )}" -v`
    );
    console.log("");
    console.log("Inspect Firestore:");
    console.log(
      "- Open Firebase console: https://console.firebase.google.com → Project → Firestore Database → Data"
    );
    console.log(
      "- Or use a small Node script with firebase-admin (example):\n\n  // scripts/getUserByEmail.js\n  // run: node scripts/getUserByEmail.js your-project-id youremail@example.com\n  // (script should initialize firebase-admin with credentials and query users collection)\n"
    );
  }

  // Listen for Firebase auth changes (if Firebase is configured) and map to our app User
  useEffect(() => {
    let unsub: () => void;
    const mod = import("./firebaseClient")
      .then((mod) => {
        if (mod && typeof mod.onAuthChange === "function") {
          // inside existing useEffect -> mod.onAuthChange callback
          unsub = mod.onAuthChange(async (fbUser: any) => {
            if (fbUser) {
              // Non-verified backend: fetch server-side user doc by uid query param
              let serverUser = null;
              try {
                const uid = fbUser.uid;
                const res = await fetch(
                  `http://localhost:3000/api/user/me?uid=${encodeURIComponent(
                    uid
                  )}`
                );
                if (res.ok) {
                  serverUser = await res.json();
                } else if (res.status === 404) {
                  serverUser = null;
                } else {
                  console.warn("Unexpected /api/user/me status", res.status);
                }
              } catch (err) {
                console.warn("Failed to fetch /api/user/me:", err);
              }

              const mapped: User = {
                id: fbUser.uid,
                name:
                  (serverUser && serverUser.name) ||
                  fbUser.displayName ||
                  (fbUser.email ? fbUser.email.split("@")[0] : "You"),
                pronouns: (serverUser && serverUser.pronouns) || "",
                mascot: (serverUser && serverUser.mascot) || "cat",
                color: (serverUser && serverUser.color) || "#FFB6C1",
                preferences: (serverUser && serverUser.preferences) || {},
                chores: normalizeChores(
                  serverUser && serverUser.chores ? serverUser.chores : {}
                ),
              };

              setCurrentUser(mapped);
              setScreen("app");
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

  // updated signature to accept chores param
  const handleOnboardingComplete = async (
    user: User,
    householdName: string,
    chores: { name: string; frequency: string }[]
  ) => {
    const merged: User = { ...user };
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
      localStorage.setItem(`onboarded:${merged.id}`, "1");
    } catch (e) {}

    // TODO: get chores through call to backend algorithm
    // Persist via backend API (no token)
    try {
      const payload = {
        user: {
          id: merged.id, // IMPORTANT: send id so backend knows which doc to create/merge
          name: merged.name,
          bday: (merged as any).bday || null,
          mascot: merged.mascot,
          color: merged.color,
          preferences: merged.preferences || {},
          // include client-selected chores (array of {name, frequency})
          chores: chores && chores.length ? chores : merged.chores || {},
          email: merged.email || null,
          password: merged.password || null,
        },
        householdName,
      };

      console.log(
        "App.handleOnboardingComplete - POST /api/user payload:",
        JSON.stringify(payload, null, 2)
      );

      // Prefer explicit backend origin first (avoids hitting Vite dev server at :5173)
      const backendOrigin =
        (window as any).__BACKEND_URL || "http://localhost:3000";
      const endpoints = [`${backendOrigin}/api/user`, "/api/user"];
      let lastErr: any = null;
      let res: Response | null = null;

      for (const ep of endpoints) {
        try {
          console.log("Attempting POST to", ep);
          res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            mode: "cors",
            credentials: "include",
            cache: "no-store",
          });
          console.log(
            `Response from ${ep}: url=${res.url} status=${res.status} ${res.statusText}`
          );
          // Log important response headers that affect CORS
          try {
            console.log(
              "Response headers (sample):",
              "Access-Control-Allow-Origin=",
              res.headers.get("access-control-allow-origin"),
              "Access-Control-Allow-Credentials=",
              res.headers.get("access-control-allow-credentials"),
              "Access-Control-Allow-Methods=",
              res.headers.get("access-control-allow-methods")
            );
          } catch (hErr) {
            console.warn("Could not read response headers:", hErr);
          }
          break;
        } catch (e) {
          lastErr = e;
          console.warn(`Failed to fetch ${ep}:`, e);
        }
      }

      if (!res) {
        console.error("All fetch attempts failed, last error:", lastErr);

        // Probe backend debug endpoints to provide more diagnostic info in console
        try {
          const dbg = await fetch(`${backendOrigin}/__server_debug`, {
            method: "GET",
            mode: "cors",
            credentials: "include",
          });
          console.log("/__server_debug status:", dbg.status, "url:", dbg.url);
          const dbgBody = await dbg.text().catch(() => "<no body>");
          console.log("/__server_debug body (text):", dbgBody);
          try {
            console.log(
              "Debug headers:",
              "Access-Control-Allow-Origin=",
              dbg.headers.get("access-control-allow-origin")
            );
          } catch {}
        } catch (e) {
          console.warn("Failed to reach backend __server_debug:", e);
        }

        try {
          const dbg2 = await fetch(
            `${backendOrigin}/api/registerUsers/__debug`,
            { method: "GET", mode: "cors", credentials: "include" }
          );
          console.log(
            "/api/registerUsers/__debug status:",
            dbg2.status,
            "url:",
            dbg2.url
          );
          const dbg2Body = await dbg2.text().catch(() => "<no body>");
          console.log("/api/registerUsers/__debug body (text):", dbg2Body);
          try {
            console.log(
              "Debug2 headers:",
              "Access-Control-Allow-Origin=",
              dbg2.headers.get("access-control-allow-origin")
            );
          } catch {}
        } catch (e) {
          console.warn("Failed to reach /api/registerUsers/__debug:", e);
        }

        throw lastErr;
      }

      let responseBody: any = null;
      try {
        responseBody = await res.json().catch(() => null);
        console.log(
          "App.handleOnboardingComplete - /api/user response body:",
          responseBody
        );
        // Print curl examples and debug hints (includes detected email/id where possible)
        try {
          const respUser = (responseBody && responseBody.user) || null;
          const emailToShow =
            (merged.email as string) ||
            (respUser && respUser.email) ||
            undefined;
          const uidToShow = (respUser && respUser.id) || merged.id || undefined;
          printCurlExamples(emailToShow, uidToShow);
        } catch (e) {}
      } catch (e) {
        const text = await res.text().catch(() => "<no body>");
        console.log(
          "App.handleOnboardingComplete - /api/user response text:",
          text
        );
      }

      if (res.status === 404) {
        console.warn(
          "/api/user returned 404 — trying /api/users as fallback (will help diagnose mount/proxy mismatch)"
        );
        try {
          const res2 = await fetch(`${backendOrigin}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            mode: "cors",
            credentials: "include",
          });
          console.log(
            "App.handleOnboardingComplete - /api/users response status:",
            res2.status,
            res2.statusText
          );
          let responseBody2: any = null;
          try {
            responseBody2 = await res2.json().catch(() => null);
            console.log(
              "App.handleOnboardingComplete - /api/users response body:",
              responseBody2
            );
          } catch (e) {
            const text = await res2.text().catch(() => "<no body>");
            console.log(
              "App.handleOnboardingComplete - /api/users response text:",
              text
            );
          }
        } catch (e) {
          console.warn("Failed fallback POST to /api/users:", e);
        }
      }
    } catch (err) {
      console.error("Error saving onboarding data:", err);
    } finally {
      setScreen("app");
    }
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
