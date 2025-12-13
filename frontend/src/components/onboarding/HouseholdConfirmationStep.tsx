import { Home, Users, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";

interface HouseholdConfirmationStepProps {
  householdData: {
    id: string;
    name: string;
    inviteCode: string;
  };
  onConfirm: () => void;
  onBack: () => void;
}

export function HouseholdConfirmationStep({
  householdData,
  onConfirm,
  onBack,
}: HouseholdConfirmationStepProps) {
  const [roommates, setRoommates] = useState<
    { name: string; mascot?: string | null; color?: string | null }[] | null
  >(null);
  const [loading, setLoading] = useState(false);

  // TODO: Try and get rid of this
  useEffect(() => {
    const hhId = householdData?.id;
    if (!hhId) {
      setRoommates([]);
      return;
    }
    let cancelled = false;
    const fetchRoommates = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/api/household/${encodeURIComponent(
            String(hhId)
          )}/roommates`,
          { method: "GET", mode: "cors", credentials: "include" }
        );
        if (!res.ok) {
          if (!cancelled) setRoommates([]);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!cancelled)
          setRoommates(Array.isArray(data?.roommates) ? data.roommates : []);
      } catch (e) {
        if (!cancelled) setRoommates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRoommates();
    return () => {
      cancelled = true;
    };
  }, [householdData?.id]);

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 p-4 rounded-3xl shadow-lg mb-4">
          <Home className="w-12 h-12 text-purple-600" />
        </div>
        <h2 className="text-purple-700 mb-2">Join Household?</h2>
        <p className="text-purple-500">
          You're about to join{" "}
          <span className="font-semibold">{householdData.name}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Household Info */}
        <div className="bg-gradient-to-br from-yellow-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/80 p-3 rounded-xl">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-purple-700 font-medium">
                {householdData.name}
              </h3>
              <p className="text-purple-400 text-sm">
                Invite Code: {householdData.inviteCode}
              </p>
            </div>
          </div>

          {/* Current Roommates */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-purple-600 text-sm font-medium">
                Current Roommates
              </span>
            </div>
            <div className="space-y-2">
              {loading && (
                <div className="text-purple-500 text-sm">
                  Loading roommates...
                </div>
              )}

              {!loading && roommates && roommates.length === 0 && (
                <div className="text-purple-500 text-sm">
                  No roommates found
                </div>
              )}

              {!loading &&
                roommates &&
                roommates.map((r, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">✨</span>
                    <span className="text-purple-700">{r.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200">
          <p className="text-purple-600 text-sm text-center">
            💡 Once you join, you'll be able to see and manage household chores
            together!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6"
          >
            Yes, Join! <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
