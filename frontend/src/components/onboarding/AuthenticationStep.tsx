import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import "../../styles/onboarding.css";
import { signInWithGoogle } from "../../firebaseClient";

interface AuthenticationStepProps {
  onNext: (auth: {
    method: "email" | "google";
    name?: string | null;
    pronouns?: string | null;
    bday?: string | null;
    email?: string | null;
    password?: string | null;
    fbUser?: any;
  }) => void;
}

export function AuthenticationStep({ onNext }: AuthenticationStepProps) {
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [bday, setBday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailTried, setEmailTried] = useState(false);
  const [googleTried, setGoogleTried] = useState(false);

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  // TODO: Check why this function is returning 404 error
  const checkEmailExists = async (
    email: string
  ): Promise<{ exists: boolean; data?: any }> => {
    if (!email) return { exists: false };

    const endpoint = `http://localhost:3000/api/user/me?email=${encodeURIComponent(
      email
    )}`;

    try {
      const res = await fetch(endpoint, {
        method: "GET",
        mode: "cors",
        credentials: "include",
      });

      if (res.status === 200) {
        const data = await res.json().catch(() => null);
        return { exists: true, data };
      }

      if (res.status === 404) {
        return { exists: false };
      }
    } catch (error) {
      // Network error - treat as email doesn't exist to proceed
      return { exists: false };
    }

    return { exists: false };
  };

  // compute whether buttons should be enabled (kept for validation UI only)
  const canSubmitEmail =
    name.trim().length > 0 &&
    pronouns.trim().length > 0 &&
    bday.trim().length > 0 &&
    validateEmail(email.trim()) &&
    password.length >= 6;

  // TODO: Get rid of
  const canSubmitGoogle = true; // allow google button to always be clickable

  const submitEmailSignup = async () => {
    setEmailTried(true);
    setError(null);

    if (!canSubmitEmail) return;
    setLoading(true);

    try {
      const { exists, data } = await checkEmailExists(
        email.trim().toLowerCase()
      );

      if (exists) {
        const userInfo =
          data?.name || data?.email ? ` (${data.name || data.email})` : "";
        setError(
          `An account already exists for this email${userInfo}. Please sign in or use a different email.`
        );
        return;
      }

      onNext({
        method: "email",
        name: name.trim(),
        pronouns: pronouns || null,
        bday: bday || null,
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      setError("Unable to verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // allow google flow without requiring pronouns/bday first
    setGoogleTried(true);
    setError(null);
    setLoading(true);

    try {
      const fbUser = await signInWithGoogle();

      if (!fbUser || !fbUser.email) {
        setError("Google sign-in failed. Please try again.");
        return;
      }

      // Check if email already exists
      try {
        const { exists, data } = await checkEmailExists(
          fbUser.email.trim().toLowerCase()
        );
        if (exists) {
          const userInfo =
            data?.user?.name || data?.user?.email
              ? ` (${data.user?.name || data.user?.email})`
              : "";
          setError(
            `An account already exists for ${fbUser.email}${userInfo}. Please sign in instead or use the same provider.`
          );
          return;
        }
      } catch (e) {
        setError("Unable to verify Google account email. Please try again.");
        return;
      }

      onNext({
        method: "google",
        fbUser,
        name: fbUser.displayName || name || null,
        email: fbUser.email || null,
        pronouns: pronouns || null,
        bday: bday || null,
      });
    } catch (error) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-12 border border-purple-100/50">
      <div className="text-center mb-8">
        <h2 className="text-purple-700 mb-2">
          Almost there — create your account
        </h2>
        <p className="text-purple-500">
          Provide a few details and a way to sign in.
        </p>
      </div>

      {/* New: Google button first */}
      <div className="flex gap-3 mb-4">
        <Button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-purple-200 rounded-2xl py-3 px-4 disabled:opacity-50 w-full justify-center"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 533.5 544.3"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            focusable="false"
          >
            <path
              fill="#4285f4"
              d="M533.5 278.4c0-18.3-1.6-36-4.6-53.2H272v100.8h146.9c-6.3 34.2-25 63.2-53.3 82.7v68.7h86.2c50.4-46.4 81.7-115 81.7-199z"
            />
            <path
              fill="#34a853"
              d="M272 544.3c72.5 0 133.3-24 177.8-65.2l-86.2-68.7c-24 16.1-54.8 25.6-91.6 25.6-70.5 0-130.3-47.6-151.7-111.5H31.7v69.8C76.2 487.8 167.2 544.3 272 544.3z"
            />
            <path
              fill="#fbbc04"
              d="M120.3 328.7c-10.7-31.7-10.7-65.9 0-97.6V161.3H31.7C-3.9 223.5-3.9 320.8 31.7 382.9l88.6-54.2z"
            />
            <path
              fill="#ea4335"
              d="M272 107.7c39.3 0 74.5 13.5 102.3 40.1l76.6-76.6C405.3 24.9 344.5 0 272 0 167.2 0 76.2 56.5 31.7 142.9l88.6 69.8C141.7 155.3 201.5 107.7 272 107.7z"
            />
          </svg>
          <span>Continue with Google</span>
        </Button>
      </div>

      {/* Separator */}
      <div className="text-center text-sm text-gray-500 mb-4">or email</div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className={
            "bg-white border-purple-200 rounded-xl " +
            (emailTried && !name.trim()
              ? "border-red-500 ring-1 ring-red-200"
              : "")
          }
        />
        {emailTried && !name.trim() && (
          <p className="text-xs text-red-600 mt-0.1 mb-0.1">
            Please enter your full name.
          </p>
        )}

        <Input
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          placeholder="Pronouns (e.g. they/them)"
          className={
            "bg-white border-purple-200 rounded-xl " +
            (emailTried && !pronouns.trim()
              ? "border-red-500 ring-1 ring-red-200"
              : "")
          }
        />
        {emailTried && !pronouns.trim() && (
          <p className="text-xs text-red-600 mt-0.1 mb-0.1">
            Please enter your pronouns.
          </p>
        )}

        <Input
          type="date"
          value={bday}
          onChange={(e) => setBday(e.target.value)}
          placeholder="Birthday"
          className={
            "bg-white border-purple-200 rounded-xl " +
            (emailTried && !bday.trim()
              ? "border-red-500 ring-1 ring-red-200"
              : "")
          }
        />
        {emailTried && !bday.trim() && (
          <p className="text-xs text-red-600 mt-0.1 mb-0.1">
            Please provide your birthday.
          </p>
        )}

        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className={
            "bg-white border-purple-200 rounded-xl " +
            (emailTried && !validateEmail(email)
              ? "border-red-500 ring-1 ring-red-200"
              : "")
          }
        />
        {emailTried && !validateEmail(email) && (
          <p className="text-xs text-red-600 mt-0.1 mb-0.1">
            Please enter a valid email address.
          </p>
        )}

        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          type="password"
          className={
            "bg-white border-purple-200 rounded-xl " +
            (emailTried && password.length < 6
              ? "border-red-500 ring-1 ring-red-200"
              : "")
          }
        />
        {emailTried && password.length < 6 && (
          <p className="text-xs text-red-600 mt-0.1 mb-0.1">
            Password must be at least 6 characters.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <Button
          onClick={submitEmailSignup}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-2xl py-3 disabled:opacity-50"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
