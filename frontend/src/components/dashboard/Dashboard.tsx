import { User } from "../../App";
import { GreetingRow } from "./GreetingRow";
import { ChoresList } from "./ChoresList";
import { FairnessMeter } from "./FairnessMeter";
import { MiniCalendar } from "./MiniCalendar";
import { LeaderboardPreview } from "./LeaderboardPreview";

interface DashboardProps {
  currentUser: User;
  onUserUpdate?: (u: User) => void;
}

export function Dashboard({ currentUser, onUserUpdate, householdMembers }: DashboardProps & { householdMembers?: { name: string; mascot?: string | null; color?: string | null }[] }) {
  return (
    <div className="space-y-6">
      <GreetingRow currentUser={currentUser} householdMembers={householdMembers} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <ChoresList currentUser={currentUser} onUserUpdate={onUserUpdate} />
          <FairnessMeter currentUser={currentUser} />
        </div>

        <div className="space-y-6">
          <MiniCalendar />
          <LeaderboardPreview currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}
