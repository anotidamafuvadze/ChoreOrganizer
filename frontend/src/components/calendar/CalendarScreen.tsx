import { useState, useEffect, useContext } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MascotIllustration } from '../mascots/MascotIllustration';
import { Button } from '../ui/button';
// Import UserContext (adjust path as needed)
import { useUser } from '../../contexts/UserContext';


const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mascots = ['cat', 'bunny', 'fox', 'frog', 'cat'] as const;



//These TYPES are essential for defining the structure of chore and day data in the CalendarScreen component. 
import type { Mascot } from '../mascots/MascotIllustration';
import { UserContext } from '../../contexts/UserContext';

type Chore = {
  name: string;
  mascot: Mascot;
  color: string;
  completed: boolean;
  time: string;
};

type DayData = {
  date: number;
  day: string;
  chores: Chore[];
};

type Stats = {
  completed: number;
  remaining: number;
  percent: number;
};

type CalendarScreenProps = {
  householdId: string;
};


//ALWAYS ON GRID
// Helper to get all days in the current week
function getWeekDays(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: d.getDate(),
      day: weekDays[d.getDay()],
      chores: [],
      fullDate: d,
    };
  });
}

// Helper to get all days in the current month
function getMonthDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return {
      date: d.getDate(),
      day: weekDays[d.getDay()],
      chores: [],
      fullDate: d,
    };
  });
}





export function CalendarScreen({ householdId }: CalendarScreenProps) {
  // const { householdId } = useContext(UserContext); 
  // const { householdId } = useUser();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [filterBy, setFilterBy] = useState<'all' | 'you' | 'roommate'>('all');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = this week
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [stats, setStats] = useState<Stats>({ completed: 0, remaining: 0, percent: 0 });
  const [loading, setLoading] = useState(false);
  
  //this fetches calendar data from the backend based on the current view (week or month) and 
  // updates the state accordingly

console.log('householdId:', householdId);

  
useEffect(() => {
  async function fetchCalendar() {
    setLoading(true);
    try {
      let url = '';
      if (view === 'week') {
        url = `http://localhost:3000/api/chores/calendar?householdId=${householdId}&weekOffset=${currentWeek}`;
      } else {
        url = url = `http://localhost:3000/api/chores/calendar?householdId=${householdId}&month=${currentMonth + 1}&year=${currentYear}`;
        // `http://localhost:3000/api/chores/calendar?householdId=${householdId}&month=${currentMonth + 1}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setCalendarData(Array.isArray(data.days) ? data.days : []);
      setStats(data.stats || { completed: 0, remaining: 0, percent: 0 });
    } catch (e) {
      setCalendarData([]);
      setStats({ completed: 0, remaining: 0, percent: 0 });
    }
    setLoading(false);
  }
    // Only fetch if householdId is available
  if (householdId) fetchCalendar();
}, [currentWeek, currentMonth, currentYear, view, householdId]);


//ALWAYS ON GRID
  // Always show all days in week/month, fill in chores if present
  let displayDays: DayData[] = [];
  if (view === 'week') {
    const weekDaysArr = getWeekDays();
    displayDays = weekDaysArr.map(day => {
      const found = calendarData.find(d => d.date === day.date && d.day === day.day);
      return found ? found : { ...day, chores: [] };
    });
  } else {
    const year = new Date().getFullYear();
    const month = currentMonth;
    // const monthDaysArr = getMonthDays(year, month);
    const monthDaysArr = getMonthDays(currentYear, currentMonth);
    displayDays = monthDaysArr.map(day => {
      const found = calendarData.find(d => d.date === day.date && d.day === day.day);
      return found ? found : { ...day, chores: [] };
    });
  }


  // function handlePrev() {
  //   // if (view === 'week') {
  //   //   setCurrentWeek((w) => w - 1);
  //   // } 
  //   // if(view === 'month') {
  //   //   setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
  //   // }
  //    if (view === 'month') {
  //   setCurrentMonth((m) => {
  //     if (m === 0) {
  //       setCurrentYear((y) => y - 1);
  //       return 11;
  //     }
  //     return m - 1;
  //   });
  // }
  // }
  function handlePrev() {
  if (view === 'month') {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }
}
  // function handleNext() {
  //   // if (view === 'week') {
  //   //   setCurrentWeek((w) => w + 1);
  //   // } 
  //   // if (view === 'month') {
  //   //   setCurrentMonth((m) => (m === 11 ? 0 : m + 1));
  //   // }
  //    if (view === 'month') {
  //   setCurrentMonth((m) => {
  //     if (m === 11) {
  //       setCurrentYear((y) => y + 1);
  //       return 0;
  //     }
  //     return m + 1;
  //   });
  // }
  // }
  function handleNext() {
  if (view === 'month') {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }
}

  // Gets the month name for display in the calendar header (grabs the current year from the user's system clock)
// const monthName = new Date(new Date().getFullYear(), currentMonth).toLocaleString('default', { month: 'long' });
const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
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
      {view === 'month' ? (
        <>
          <button className="p-2 hover:bg-purple-100 rounded-xl transition-colors" 
            onClick={handlePrev}>
            <ChevronLeft className="w-5 h-5 text-purple-600" />
          </button>
          {/* <h3 className="text-purple-700">{monthName} {new Date().getFullYear()}</h3> */}
          <h3 className="text-purple-700">{monthName} {currentYear}</h3>
          <button className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
            onClick={handleNext}>
            <ChevronRight className="w-5 h-5 text-purple-600" /> 
          </button>
        </>
      ) : (
        // <h3 className="text-purple-700 w-full text-center">{monthName} {new Date().getFullYear()}</h3>
        // <h3 className="text-purple-700 w-full text-center">{monthName} {currentYear}</h3>
        <h3 className="text-purple-700 w-full text-center">
          {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
        </h3>

      )}
    </div>

      {/*ALWAYS ON GRID*/} 
      {/* Month View */}
      {view === 'month' && (
        <div className="grid grid-cols-7 gap-4">
          {loading ? (
            <div className="col-span-7 text-center text-purple-400">Loading...</div>
          ) : (
            displayDays.map((day, index) => (
              <div
                key={index}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border min-h-[120px] border-purple-100/50 shadow"
              >
                <div className="text-center mb-2 pb-2 border-b border-purple-100">
                  <p className="text-purple-500 text-xs mb-1">{day.day}</p>
                  <div className="w-8 h-8 rounded-xl mx-auto flex items-center justify-center bg-purple-50 text-purple-600">
                    {day.date}
                  </div>
                </div>
                <div className="space-y-2">
                  {day.chores.length === 0 ? (
                    <p className="text-xs text-purple-300 text-center">No chores</p>
                  ) : (
                    day.chores.map((chore, choreIndex) => (
                      <div
                        key={choreIndex}
                        className={`p-2 rounded-xl border ${
                          chore.completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MascotIllustration mascot={chore.mascot} color={chore.color} size={20} />
                          {chore.completed && (
                            <div className="w-3 h-3 bg-green-400 rounded-full flex items-center justify-center ml-auto">
                              <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
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
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-4">
          {loading ? (
            <div className="col-span-7 text-center text-purple-400">Loading...</div>
          ) : (
            displayDays.map((day, index) => {
              const today = new Date();
              const isToday =
                day.date === today.getDate() &&
                day.day === weekDays[today.getDay()];

              return (
                <div
                  key={index}
                  className={`bg-white/60 backdrop-blur-sm rounded-2xl p-4 border min-h-[280px] ${
                    isToday
                      ? 'border-purple-300 shadow-lg'
                      : 'border-purple-100/50 shadow'
                  }`}
                >
                  <div
                    className={`text-center mb-4 pb-3 border-b ${
                      isToday ? 'border-purple-200' : 'border-purple-100'
                    }`}
                  >
                    <p className="text-purple-500 text-xs mb-1">{day.day}</p>
                    <div
                      className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center ${
                        isToday
                          ? 'bg-gradient-to-br from-purple-400 to-pink-400 text-white'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {day.date}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {day.chores.length === 0 ? (
                      <p className="text-xs text-purple-300 text-center">No chores</p>
                    ) : (
                      day.chores.map((chore, choreIndex) => (
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
                                <svg
                                  className="w-3 h-3 text-white"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p
                            className={`text-xs mb-1 ${
                              chore.completed
                                ? 'text-green-700'
                                : 'text-purple-700'
                            }`}
                          >
                            {chore.name}
                          </p>
                          <p className="text-xs text-purple-400">{chore.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
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
              You've completed {stats.percent}% of your chores! 🎉 
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-purple-500 text-sm mb-1">Completed</p>
              <p className="text-purple-700 text-2xl">{stats.completed}</p>
            </div>
            <div className="text-center">
              <p className="text-purple-500 text-sm mb-1">Remaining</p>
              <p className="text-purple-700 text-2xl">{stats.remaining}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
