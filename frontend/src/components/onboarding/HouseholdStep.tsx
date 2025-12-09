import { useState } from "react";
import { Home, Users, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface HouseholdStepProps {
  onNext: (
    householdNameOrData:
      | string
      | { id: string; name: string; inviteCode: string },
    inviteCode?: string
  ) => void;
  onBack?: () => void;
}

export function HouseholdStep({ onNext, onBack }: HouseholdStepProps) {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setError(null);

    if (mode === "create" && householdName) {
      onNext(householdName);
    } else if (mode === "join" && inviteCode) {
      setLoading(true);
      try {
        const code = inviteCode.trim();
        const res = await fetch(
          `http://localhost:3000/api/user/invite/${encodeURIComponent(code)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            credentials: "include",
          }
        );

        if (!res.ok) {
          let err: any = {};
          setError("Invalid invite code. Please try again.");
          setLoading(false);
          return;
        }

        const householdData = await res.json();
        onNext(householdData, code);
      } catch (err) {
        console.error("Error validating invite code:", err);
        setError(
          "Network error. Please check your connection and ensure the server is running."
        );
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 p-4 rounded-3xl shadow-lg mb-4">
          <Home className="w-12 h-12 text-purple-600" />
        </div>
        <h2 className="text-purple-700 mb-2">Set Up Your Household</h2>
        <p className="text-purple-500">
          Create a new household or join your roomies!
        </p>
      </div>

      {!mode && (
        <div className="grid grid-cols-2 gap-6">
          <button
            onClick={() => setMode("create")}
            className="bg-gradient-to-br from-yellow-100 to-pink-100 hover:from-yellow-200 hover:to-pink-200 rounded-2xl p-8 border-2 border-purple-200 transition-all hover:shadow-lg hover:scale-105"
          >
            <div className="bg-white/80 p-4 rounded-2xl inline-flex mb-4">
              <Home className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-purple-700 mb-2">Create Household</h3>
            <p className="text-purple-500 text-sm">
              Start fresh and invite your roommates
            </p>
          </button>

          <button
            onClick={() => setMode("join")}
            className="bg-gradient-to-br from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 rounded-2xl p-8 border-2 border-purple-200 transition-all hover:shadow-lg hover:scale-105"
          >
            <div className="bg-white/80 p-4 rounded-2xl inline-flex mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-purple-700 mb-2">Join Household</h3>
            <p className="text-purple-500 text-sm">
              Use an invite code from your roommate
            </p>
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-6">
          <div>
            <label className="text-purple-600 mb-2 block">Household Name</label>
            <Input
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="e.g., Unit 3B Roomies, The Dream Team..."
              className="bg-white/80 border-purple-200 rounded-2xl text-lg py-6"
            />
            <p className="text-purple-400 text-sm mt-2">
              Pick something fun that represents your crew! ✨
            </p>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200">
            <p className="text-purple-600 text-sm">
              💡 <span className="font-medium">Pro tip:</span> You'll get an
              invite code to share with your roommates after setup!
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onBack ? onBack : () => setMode(null)}
              className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6"
            >
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!householdName}
              className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-6">
          <div>
            <label className="text-purple-600 mb-2 block">Invite Code</label>
            <Input
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setError(null);
              }}
              placeholder="Enter 6-digit code"
              className="bg-white/80 border-purple-200 rounded-2xl text-lg py-6 text-center tracking-widest"
              maxLength={6}
            />
            <p className="text-purple-400 text-sm mt-2">
              Ask your roommate for the invite code from their dashboard!
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onBack ? onBack : () => setMode(null)}
              className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6"
              disabled={loading}
            >
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={inviteCode.length !== 6 || loading}
              className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Validating..." : "Join Household"}{" "}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
