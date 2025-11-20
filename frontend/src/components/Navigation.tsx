import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface NavItem {
  id: 'home' | 'chores' | 'calendar' | 'leaderboard' | 'settings';
  label: string;
  icon: LucideIcon;
}

interface NavigationProps {
  items: NavItem[];
  activeView: string;
  onNavigate: (view: 'home' | 'chores' | 'calendar' | 'leaderboard' | 'settings') => void;
}

const colorMap = {
  home: 'from-yellow-200 to-yellow-300',
  chores: 'from-mint-200 to-green-200',
  calendar: 'from-blue-200 to-blue-300',
  leaderboard: 'from-pink-200 to-purple-300',
  settings: 'from-purple-200 to-purple-300',
};

export function Navigation({ items, activeView, onNavigate }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-md border-t border-purple-100/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-around gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center gap-1 transition-transform hover:scale-105"
              >
                <div className={`p-3 rounded-2xl transition-all ${
                  isActive 
                    ? `bg-gradient-to-br ${colorMap[item.id]} shadow-md` 
                    : 'bg-transparent hover:bg-purple-50'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-purple-400'}`} />
                </div>
                <span className={`text-xs ${isActive ? 'text-purple-700' : 'text-purple-400'}`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
