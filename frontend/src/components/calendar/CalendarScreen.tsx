import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';
import { Button } from '../ui/button';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mascots = ['cat', 'bunny', 'fox', 'frog', 'cat'] as const;

// TODO: Replace the Calendar data on the CalendarScreen with real data fetching from backend
const calendarData = Array.from({ length: 7 }, (_, i) => ({
  date: i + 10,
  day: weekDays[i % 7],
  chores: i < 5 ? [
    { 
      name: ['Trash', 'Dishes', 'Sweep', 'Kitchen', 'Bathroom'][i],
      mascot: mascots[i],
      color: ['#FFB6C1', '#A7C7E7', '#E6B8FF', '#FFDAB9', '#FFB6C1'][i],
      completed: i < 3,
      time: '9:00 AM'
    }
  ] : []
}));

export function CalendarScreen() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [filterBy, setFilterBy] = useState<'all' | 'you' | 'roommate'>('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-700 mb-2">
            Chore Calendar
          </h2>
          <p className="text-purple-500">
            Keep track of who's doing what and when! 📅
          </p>
        </div>
        <div className="flex gap-3">
      
          <div className="bg-white/60 rounded-2xl border border-purple-200 p-1 flex gap-1">
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                view === 'week'
                  ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                view === 'month'
                  ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-purple-100/50 shadow-lg flex items-center justify-between">
        <button className="p-2 hover:bg-purple-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-purple-600" />
        </button>
        <h3 className="text-purple-700">November 2024</h3>
        <button className="p-2 hover:bg-purple-100 rounded-xl transition-colors">
          {/* TODO: Add/Implement button to navigate to next week or month on the CalendarScreen */}
          <ChevronRight className="w-5 h-5 text-purple-600" /> 
        </button>
      </div>
      {/* TODO: Add a month view and allow toggling between months on the CalendarScreen */}
      {view === 'month' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-purple-100/50 shadow-lg text-center text-purple-600">
          Month view coming soon! Stay tuned 📅✨
        </div>
      )}


      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-4">
          {calendarData.map((day, index) => {
            const isToday = day.date === 14;
            
            return (
              <div
                key={index}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl p-4 border min-h-[280px] ${
                  isToday
                    ? 'border-purple-300 shadow-lg'
                    : 'border-purple-100/50 shadow'
                }`}
              >
                <div className={`text-center mb-4 pb-3 border-b ${
                  isToday ? 'border-purple-200' : 'border-purple-100'
                }`}>
                  <p className="text-purple-500 text-xs mb-1">{day.day}</p>
                  <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center ${
                    isToday
                      ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    {day.date}
                  </div>
                </div>

                <div className="space-y-3">
                  {day.chores.map((chore, choreIndex) => (
                    <div
                      key={choreIndex}
                      className={`p-3 rounded-xl border ${
                        chore.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-purple-50 border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MascotIllustration 
                          mascot={chore.mascot} 
                          color={chore.color} 
                          size={25}
                        />
                        {chore.completed && (
                          <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center ml-auto">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs mb-1 ${
                        chore.completed ? 'text-green-700' : 'text-purple-700'
                      }`}>
                        {chore.name}
                      </p>
                      <p className="text-xs text-purple-400">{chore.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="bg-gradient-to-br from-green-100 to-teal-100 backdrop-blur-sm rounded-3xl p-8 border border-green-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-purple-700 mb-2">
              This Week's Progress
            </h3>
            <p className="text-purple-600 text-lg">
              {/* TODO: Calculate and display real progress on the weekly summary section of CalendarScreen */}
              85% complete • Amazing work team! 🎉
            </p>
          </div>
          <div className="flex gap-6">
             {/* TODO: Calculate and display real stats on the weekly summary section of CalendarScreen */}
            <div className="text-center">
              <p className="text-purple-500 text-sm mb-1">Completed</p>
              <p className="text-purple-700 text-2xl">17</p>
            </div>
            <div className="text-center">
              <p className="text-purple-500 text-sm mb-1">Remaining</p>
              <p className="text-purple-700 text-2xl">3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
