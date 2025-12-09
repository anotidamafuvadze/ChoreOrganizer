import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { Mascot } from "../../App";

interface MascotStepProps {
  onNext: (mascot: { type: Mascot; color: string }) => void;
  onBack?: () => void;
}

const mascots: { type: Mascot; name: string }[] = [
  { type: "cat", name: "Cozy Cat" },
  { type: "bunny", name: "Busy Bunny" },
  { type: "frog", name: "Fresh Frog" },
  { type: "bird", name: "Bright Bird" },
  { type: "fox", name: "Friendly Fox" },
  { type: "bear", name: "Brave Bear" },
];

const colors = [
  { hex: "#FFB6C1", name: "Soft Pink" },
  { hex: "#B4E7CE", name: "Mint Green" },
  { hex: "#A7C7E7", name: "Baby Blue" },
  { hex: "#E6B8FF", name: "Lavender" },
  { hex: "#FFE4B5", name: "Peach" },
  { hex: "#FFDAB9", name: "Apricot" },
  { hex: "#F0E68C", name: "Soft Yellow" },
  { hex: "#DDA0DD", name: "Plum" },
];

export function MascotStep({ onNext, onBack }: MascotStepProps) {
  const [selectedMascot, setSelectedMascot] = useState<Mascot | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#FFB6C1");

  const handleContinue = () => {
    if (selectedMascot) {
      onNext({ type: selectedMascot, color: selectedColor });
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50">
      <div className="text-center mb-8">
        <h2 className="text-purple-700 mb-2">Choose Your Mascot!</h2>
        <p className="text-purple-500">
          Pick an adorable friend to represent you ✨
        </p>
      </div>

      {/* Preview */}
      {selectedMascot && (
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl shadow-lg border-2 border-purple-200">
            <MascotIllustration
              mascot={selectedMascot}
              color={selectedColor}
              size={120}
              showSparkle
            />
            <p className="mt-4 text-purple-700">
              Your {mascots.find((m) => m.type === selectedMascot)?.name}!
            </p>
          </div>
        </div>
      )}

      {/* Mascot Selection */}
      <div className="mb-8">
        <h3 className="text-purple-600 mb-4 text-center">Pick Your Animal</h3>
        <div className="grid grid-cols-3 gap-4">
          {mascots.map((mascot) => (
            <button
              key={mascot.type}
              onClick={() => setSelectedMascot(mascot.type)}
              className={`p-6 rounded-2xl border-2 transition-all ${
                selectedMascot === mascot.type
                  ? "bg-gradient-to-br from-purple-100 to-pink-100 border-purple-400 shadow-lg scale-105"
                  : "bg-white/60 border-purple-200 hover:border-purple-300 hover:shadow-md"
              }`}
            >
              <MascotIllustration
                mascot={mascot.type}
                color={selectedColor}
                size={60}
              />
              <p
                className={`mt-3 text-sm ${
                  selectedMascot === mascot.type
                    ? "text-purple-700"
                    : "text-purple-600"
                }`}
              >
                {mascot.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      {selectedMascot && (
        <div className="mb-8">
          <h3 className="text-purple-600 mb-4 text-center">
            Choose Your Color
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {colors.map((color) => (
              <button
                key={color.hex}
                onClick={() => setSelectedColor(color.hex)}
                className={`w-12 h-12 rounded-full border-4 transition-all ${
                  selectedColor === color.hex
                    ? "border-purple-500 shadow-lg scale-110"
                    : "border-white hover:border-purple-300"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          className="flex-1 bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl py-6"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedMascot}
          className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl py-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
