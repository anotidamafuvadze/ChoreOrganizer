import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';

// TODO: Replace with real calendar data fetching from backend (calendar dates should update based on current week)
const mockCalendarData = [
  { date: 10, chores: [{ mascot: 'cat' as const, color: '#FFB6C1', completed: true }] },
  { date: 11, chores: [{ mascot: 'bunny' as const, color: '#A7C7E7', completed: true }] },
  { date: 12, chores: [{ mascot: 'fox' as const, color: '#E6B8FF', completed: true }] },
  { date: 13, chores: [{ mascot: 'cat' as const, color: '#FFB6C1', completed: false }] },
  { date: 14, chores: [{ mascot: 'frog' as const, color: '#FFDAB9', completed: false }] }, // Today
];

export function MiniCalendar() {
  const today = 14;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          <h3 className="text-purple-700">This Week</h3>
        </div>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-purple-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-purple-400" />
          </button>
          <button className="p-1 hover:bg-purple-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {mockCalendarData.map(day => {
          const isToday = day.date === today;
          
          return (
            <div
              key={day.date}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isToday
                  ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300'
                  : day.chores[0].completed
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : 'bg-white/60 border-purple-100 hover:bg-purple-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    isToday
                      ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {day.date}
                  </div>
                  <span className="text-purple-600 text-sm">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'][day.date - 10]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MascotIllustration 
                    mascot={day.chores[0].mascot} 
                    color={day.chores[0].color} 
                    size={25}
                  />
                  {day.chores[0].completed && (
                    <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
