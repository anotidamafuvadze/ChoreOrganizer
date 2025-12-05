import { Sparkles, LogOut } from "lucide-react";
import React, { useState } from "react";

interface HeaderProps {
  household: string;
  inviteCode?: string | null;
  onLogout?: () => void;
}

export function Header({ household, inviteCode, onLogout }: HeaderProps) {
  const [error, setError] = useState<string | null>(null);

  // TODO: Implement real week calculation based on current date and household start date
  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor(diff / oneWeek);
    return `Week ${week}`;
  };

  return (
    <header className="w-full max-w-7xl mx-auto py-6 px-8 flex items-center justify-between">
      {/* Error display */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-xs mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Household title */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-yellow-200 to-pink-200 p-2 rounded-2xl shadow-sm">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-purple-700 flex items-center gap-2">
            Chore, I'll do it!
          </h1>
          <p className="text-purple-400 text-sm">{household}</p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Invite code */}
        {inviteCode && (
          <div className="flex flex-col items-end mr-2">
            <div className="text-xs uppercase tracking-wide text-gray-600">
              Invite Code
            </div>
            <div className="mt-1 inline-flex items-center justify-center px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-mono font-semibold text-sm shadow-md">
              {inviteCode}
            </div>
          </div>
        )}

        {/* Week display */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-2 rounded-full shadow-sm">
          <p className="text-purple-600 text-sm">{getCurrentWeek()}</p>
        </div>

        {/* Logout button */}
        <button
          onClick={async () => {
            if (typeof onLogout === "function") {
              onLogout();
            } else {
              // fallback: call backend then reload
              try {
                await fetch("http://localhost:3000/api/user/logout", {
                  method: "POST",
                  mode: "cors",
                  credentials: "include",
                });
              } catch (e) {
                // ignore
              }
              window.location.replace("/?logged_out=1");
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-purple-100 text-purple-600 hover:bg-white"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Log out</span>
        </button>
      </div>
    </header>
  );
}
