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
import { HouseholdConfirmationStep } from "./HouseholdConfirmationStep";

interface OnboardingFlowProps {
  onComplete: (
    user: User,
    household: string,
    chores: { name: string; frequency: string }[],
    inviteCode?: string
  ) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [householdData, setHouseholdData] = useState<{
    id: string;
    name: string;
    inviteCode: string;
  } | null>(null);
  const [selectedChores, setSelectedChores] = useState<
    { name: string; frequency: string }[]
  >([]);
  const [preferences, setPreferences] = useState<
    Record<string, "love" | "neutral" | "avoid">
  >({});
  const [selectedMascot, setSelectedMascot] = useState<any>(null);
  const [authData, setAuthData] = useState<any>(null);

  const handleBack = () => setStep((prev) => Math.max(0, prev - 1));

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <HouseholdStep
      key="household"
      onNext={(nameOrData, code) => {
        if (typeof nameOrData === "string") {
          // Creating new household
          setHouseholdName(nameOrData);
          setInviteCode(null);
          setHouseholdData(null);
          setStep(2); // Skip confirmation, go to chores
        } else {
          // Joining existing household
          setHouseholdData(nameOrData);
          setHouseholdName(nameOrData.name);
          setInviteCode(code || null);
          setStep(2); // Go to confirmation step
        }
      }}
      onBack={handleBack}
    />,
    // Conditionally show confirmation step only if joining household
    ...(householdData
      ? [
        <HouseholdConfirmationStep
          key="confirmation"
          householdData={householdData}
          onConfirm={async () => {
            try {
              const id = householdData.id;
              const res = await fetch(
                `http://localhost:3000/api/household/${encodeURIComponent(
                  String(id)
                )}`,
                {
                  method: "GET",
                  mode: "cors",
                  credentials: "include",
                }
              );
              if (res.ok) {
                const hh = await res.json().catch(() => null);
                const choresFromApi = Array.isArray(hh?.chores)
                  ? hh.chores
                  : [];
                const mapped = choresFromApi.map((c: any) => ({
                  name: c.name || String(c.id || ""),
                  frequency: c.frequency || c.freq || "weekly",
                }));
                setSelectedChores(mapped);
              } else {
                // if fetch fails, ensure we don't block onboarding — continue with empty chores
                setSelectedChores([]);
              }
            } catch (e) {
              setSelectedChores([]);
            } finally {
              // PreferencesStep index is 4 when householdData is present
              setStep(4);
            }
          }}
          onBack={() => {
            setHouseholdData(null);
            setInviteCode(null);
            setStep(1);
          }}
        />,
      ]
      : []),
    <ChoresStep
      key="chores"
      onNext={(chores) => {
        setSelectedChores(chores);
        setStep(householdData ? 4 : 3);
      }}
      onBack={handleBack}
    />,
    <PreferencesStep
      key="preferences"
      chores={selectedChores.map((c) => c.name)}
      onNext={(prefs) => {
        setPreferences(prefs);
        setStep(householdData ? 5 : 4);
      }}
      onBack={handleBack}
    />,
    <MascotStep
      key="mascot"
      onNext={(mascot) => {
        setSelectedMascot(mascot);
        setStep(householdData ? 6 : 5);
      }}
      onBack={handleBack}
    />,
    <AuthenticationStep
      key="auth"
      onNext={(data) => {
        setAuthData(data);
        setStep(householdData ? 7 : 6);
      }}
      onBack={handleBack}
    />,
    <ConfirmationStep
      key="final-confirmation"
      household={householdName}
      mascot={selectedMascot}
      onComplete={() => {
        const generatedId =
          (authData && authData.method === "google" && authData.fbUser?.uid) ||
          `u-${Date.now()}`;
          console.log(generatedId)

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

        onComplete(
          user,
          householdName,
          selectedChores,
          inviteCode || undefined
        );
      }}
      onBack={handleBack}
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
            className={`h-2 rounded-full transition-all ${index === step
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
