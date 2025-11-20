import { useState } from 'react';
import { Plus, Heart, Meh, X, Trash2, Droplets, Sparkles, Utensils } from 'lucide-react';
import { Button } from '../ui/button';
import {MascotIllustration } from '../mascots/MascotIllustration';
import { Mascot } from '../../App';

// TODO: Replace the chore list with real data fetching from backend on the ChoresScreen
const choresList = [
  { id: '1', name: 'Take Out Trash', icon: Trash2, frequency: 'Weekly', assignedTo: 'You', color: '#FFB6C1' },
  { id: '2', name: 'Wash Dishes', icon: Droplets, frequency: 'Daily', assignedTo: 'Alex', color: '#A7C7E7' },
  { id: '3', name: 'Sweep Living Room', icon: Sparkles, frequency: 'Weekly', assignedTo: 'Jamie', color: '#E6B8FF' },
  { id: '4', name: 'Clean Kitchen', icon: Utensils, frequency: 'Biweekly', assignedTo: 'Sam', color: '#FFDAB9' },
];

const nextWeekRotation = [
  { choreName: 'Take Out Trash', points: 10, assignedTo: { name: 'Alex', mascot: 'bunny' as Mascot, color: '#A7C7E7' } },
  { choreName: 'Wash Dishes', points: 15, assignedTo: { name: 'You', mascot: 'cat' as Mascot, color: '#FFB6C1' } },
];

// TODO: Replace the preference stats with real data fetching from backend on the ChoresScreen
const preferenceStats = {
  'Take Out Trash': { love: 1, neutral: 2, avoid: 1 },
  'Wash Dishes': { love: 0, neutral: 3, avoid: 1 },
  'Sweep Living Room': { love: 2, neutral: 1, avoid: 1 },
  'Clean Kitchen': { love: 1, neutral: 2, avoid: 1 },
};

// TODO: Implement edit chore functionality
const handleEditChore = (choreId: string) => {

}

// TODO: Implement add chore functionality
const addChore = () => {

}

// TODO: Implement preference update functionality
const updatePreference = (choreId: string, preference: 'love' | 'neutral' | 'avoid') => {

}


export function ChoresScreen() {
  const [selectedChore, setSelectedChore] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-purple-700 mb-2">
            Household Chores
          </h2>
          <p className="text-purple-500">
            Manage chores, preferences, and rotations for your household ✨
          </p>
        </div>
        <Button className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg" onClick={addChore}>
          <Plus className="w-4 h-4 mr-2" />
          Add Chore
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chore List */}
        <div className="col-span-2 bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
          <h3 className="text-purple-700 mb-4">All Chores</h3>
          <div className="space-y-3">
            {choresList.map(chore => {
              const Icon = chore.icon;
              const isSelected = selectedChore === chore.id;
              
              return (
                <button
                  key={chore.id}
                  onClick={() => setSelectedChore(chore.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300 shadow-md'
                      : 'bg-white/80 border-purple-100 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-50 p-3 rounded-xl">
                        <Icon className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-purple-700">{chore.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                            {chore.frequency}
                          </span>
                          <span className="text-xs text-purple-500">
                            Assigned to {chore.assignedTo}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-purple-100 rounded-lg transition-colors" onClick={() => handleEditChore(chore.id)}>
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preference Panel */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
            <h3 className="text-purple-700 mb-4">Your Preferences</h3>
            <div className="space-y-4">
              {choresList.map(chore => (
                <div key={chore.id} className="bg-white/60 rounded-xl p-3 border border-purple-100">
                  <p className="text-purple-700 text-sm mb-2">{chore.name}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 p-2 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors" onClick={() => updatePreference(chore.id, 'love')}>
                      <Heart className="w-4 h-4 text-pink-400 mx-auto" />
                    </button>
                    <button className="flex-1 p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors" onClick={() => updatePreference(chore.id, 'neutral')}>
                      <Meh className="w-4 h-4 text-yellow-400 mx-auto" />
                    </button>
                    <button className="flex-1 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => updatePreference(chore.id, 'avoid')}>
                      <X className="w-4 h-4 text-gray-400 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rotation Preview */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
            <h3 className="text-purple-700 mb-4">Next Week's Rotation</h3>
            <div className="space-y-3">
              {nextWeekRotation.map((rot, idx) => (
                <div
                  key={`${rot.choreName}-${idx}`}
                  className={`rounded-xl p-4 border border-purple-100 ${idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-pink-50' : 'bg-gradient-to-r from-blue-50 to-purple-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 text-sm">{rot.choreName}</span>
                    <span className="text-purple-600 text-xs">{rot.points} pts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MascotIllustration mascot={rot.assignedTo.mascot} color={rot.assignedTo.color} size={25} />
                    <span className="text-purple-600 text-sm">{rot.assignedTo.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-xl text-sm">
              Preview All Assignments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}