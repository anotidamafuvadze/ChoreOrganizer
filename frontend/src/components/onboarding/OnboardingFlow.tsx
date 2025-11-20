import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../App';
import { WelcomeStep } from './WelcomeStep';
import { HouseholdStep } from './HouseholdStep';
import { ChoresStep } from './ChoresStep';
import { PreferencesStep } from './PreferencesStep';
import { MascotStep } from './MascotStep';
import { ConfirmationStep } from './ConfirmationStep';

interface OnboardingFlowProps {
  onComplete: (user: User, household: string) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [householdName, setHouseholdName] = useState('');
  const [selectedChores, setSelectedChores] = useState<{ name: string; frequency: string; }[]>([]);
  const [preferences, setPreferences] = useState<Record<string, 'love' | 'neutral' | 'avoid'>>({});
  const [selectedMascot, setSelectedMascot] = useState<any>(null);

  // TODO: Add steps that asks for availability and user name / birthday (no chores on birthday ??)
  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <HouseholdStep key="household" onNext={(name) => { setHouseholdName(name); setStep(2); }} />,
    <ChoresStep key="chores" onNext={(chores) => { setSelectedChores(chores); setStep(3); }} />,
    <PreferencesStep 
      key="preferences" 
      chores={selectedChores.map((c) => c.name)}
      onNext={(prefs) => { setPreferences(prefs); setStep(4); }} 
    />,
     // TODO: <AvailabilityStep key="availability" onNext={() => setStep(5)} />,
    
    <MascotStep key="mascot" onNext={(mascot) => { setSelectedMascot(mascot); setStep(5); }} />,
    // TODO: <UserInfoStep key="userinfo" onNext={() => setStep(6)} />,
    // TODO: <InviteCodeStep key="invite" onNext={() => setStep(7)} />,
    <ConfirmationStep 
      key="confirmation" 
      household={householdName}
      mascot={selectedMascot}
      onComplete={() => {
        // TODO: Handle real user creation and onboarding completion (user ID should be random UUID and backend matched)
        const user: User = {
          id: '1',
          name: 'You',
          mascot: selectedMascot.type,
          color: selectedMascot.color,
          preferences: preferences,
        };
        onComplete(user, householdName);
      }}
    />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-[#FFE8F5] to-[#E6F7FF] flex items-center justify-center p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === step 
                ? 'w-8 bg-purple-400' 
                : index < step 
                ? 'w-2 bg-purple-300' 
                : 'w-2 bg-purple-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
