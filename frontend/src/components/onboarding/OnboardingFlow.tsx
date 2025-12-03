import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../../App";
import { WelcomeStep } from "./WelcomeStep";
import { HouseholdStep } from "./HouseholdStep";
import { ChoresStep } from "./ChoresStep";
import { PreferencesStep } from "./PreferencesStep";
import { MascotStep } from "./MascotStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { AuthenticationStep } from "./AuthenticationStep";

interface OnboardingFlowProps {
  onComplete: (
    user: User,
    household: string,
    chores: { name: string; frequency: string }[]
  ) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [householdName, setHouseholdName] = useState("");
  const [selectedChores, setSelectedChores] = useState<
    { name: string; frequency: string }[]
  >([]);
  const [preferences, setPreferences] = useState<
    Record<string, "love" | "neutral" | "avoid">
  >({});
  const [selectedMascot, setSelectedMascot] = useState<any>(null);
  const [authData, setAuthData] = useState<any>(null);

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <HouseholdStep
      key="household"
      onNext={(name) => {
        setHouseholdName(name);
        setStep(2);
      }}
    />,
    <ChoresStep
      key="chores"
      onNext={(chores) => {
        setSelectedChores(chores);
        setStep(3);
      }}
    />,
    <PreferencesStep
      key="preferences"
      chores={selectedChores.map((c) => c.name)}
      onNext={(prefs) => {
        setPreferences(prefs);
        setStep(4);
      }}
    />,
    <MascotStep
      key="mascot"
      onNext={(mascot) => {
        setSelectedMascot(mascot);
        setStep(5);
      }}
    />,
    <AuthenticationStep
      key="auth"
      onNext={(data) => {
        setAuthData(data);
        setStep(6);
      }}
    />,
    <ConfirmationStep
      key="confirmation"
      household={householdName}
      mascot={selectedMascot}
      onComplete={() => {
        const generatedId =
          (authData && authData.method === "google" && authData.fbUser?.uid) ||
          `u-${Date.now()}`;

        const user: User = {
          id: generatedId as string,
          name:
            (authData && (authData.name || authData.fbUser?.displayName)) ||
            "You",
          pronouns: (authData && authData.pronouns) || "they/them",
          bday: (authData && authData.bday) || null,
          mascot: selectedMascot?.type || selectedMascot || "cat",
          color: selectedMascot?.color || "#FFB6C1",
          preferences: preferences,
          email: authData?.email,
          password: authData?.password,
        } as User;

        onComplete(user, householdName, selectedChores);
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
                ? "w-8 bg-purple-400"
                : index < step
                ? "w-2 bg-purple-300"
                : "w-2 bg-purple-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
