import { User } from '../../App';
import { GreetingRow } from './GreetingRow';
import { ChoresList } from './ChoresList';
import { FairnessMeter } from './FairnessMeter';
import { MiniCalendar } from './MiniCalendar';
import { LeaderboardPreview } from './LeaderboardPreview';

interface DashboardProps {
  currentUser: User;
}

export function Dashboard({ currentUser }: DashboardProps) {
  return (
    <div className="space-y-6">
      <GreetingRow currentUser={currentUser} />
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <ChoresList currentUser={currentUser} />
          <FairnessMeter />
        </div>
        
        <div className="space-y-6">
          <MiniCalendar />
          <LeaderboardPreview />
        </div>
      </div>

    </div>
  );
}
