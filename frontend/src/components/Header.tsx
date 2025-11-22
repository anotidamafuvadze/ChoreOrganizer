import { Sparkles, LogOut } from "lucide-react";

interface HeaderProps {
  household: string;
}

// TODO: Implement real week calculation based on current date and household start date
export function Header({ household }: HeaderProps) {
  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor(diff / oneWeek);
    return `Week ${week}`;
  };

  return (
    <header className="bg-white/40 backdrop-blur-sm border-b border-purple-100/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
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

        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-2 rounded-full shadow-sm">
            <p className="text-purple-600 text-sm">{getCurrentWeek()}</p>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const mod = await import("../firebaseClient");
                if (mod && typeof mod.signOut === "function") {
                  await mod.signOut();
                  return;
                }
              } catch (e) {
                // ignore - we'll fallback to reload
              }
              // Fallback: reload to reset app state when firebase isn't configured
              window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-purple-100 text-purple-600 hover:bg-white"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
