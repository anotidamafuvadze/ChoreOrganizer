import { Mail, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MascotIllustration } from "./mascots/MascotIllustration";
import { signInWithGoogle } from "../firebaseClient";
import { User } from "../App";
import { useState } from "react";

// TODO: Display visible error messages for login failures

interface LoginScreenProps {
  onLoginComplete: (email?: string, password?: string) => void;
  onSignUpClick: () => void;
  currentUser?: User | null;
}

export function LoginScreen({
  onLoginComplete,
  onSignUpClick,
  currentUser,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async () => {
    setError(null);
    if (!email || !password) return setError("Enter email and password");
    setLoading(true);
    try {
      /// Only store email if not empty
    if (email.trim() !== "") {
      localStorage.setItem("email", email.toLowerCase());
    }
      onLoginComplete(email.toLowerCase(), password);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const fbUser = await signInWithGoogle();
      if (!fbUser || !fbUser.email) return setError("Google sign-in did not return an email");
       // Only store email if not empty
      if (fbUser.email && String(fbUser.email).trim() !== "") {
      localStorage.setItem("email", String(fbUser.email).toLowerCase());
    }
      onLoginComplete(String(fbUser.email).toLowerCase());

    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-[#FFE8F5] to-[#E6F7FF] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-purple-100/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-yellow-200 to-pink-200 p-4 rounded-3xl shadow-lg mb-4">
              <Sparkles className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-purple-700 mb-2">Chore, I'll do it!</h1>
            <p className="text-purple-500">
              Make chores fun with your roomies! ✨
            </p>
          </div>

          {/* Mascot Illustration */}
          <div className="flex justify-center gap-3 mb-8">
            <MascotIllustration mascot="cat" color="#FFB6C1" size={60} />
            <MascotIllustration mascot="bunny" color="#B4E7CE" size={60} />
            <MascotIllustration mascot="frog" color="#A7C7E7" size={60} />
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            {currentUser ? (
              <div className="mb-2">
                <Button
                  onClick={() => onLoginComplete()}
                  className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg py-4"
                >
                  Continue as {currentUser.name}
                </Button>
              </div>
            ) : null}
            <div>
              <label className="text-purple-600 text-sm mb-2 block">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@college.edu"
                className="bg-white/80 border-purple-200 rounded-2xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-purple-600 text-sm mb-2 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-white/80 border-purple-200 rounded-2xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

            <Button
              onClick={handleEmailSignIn}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl shadow-lg py-6"
            >
              <Mail className="w-4 h-4 mr-2" />
              Sign In
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-purple-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/60 text-purple-400">or</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-purple-50 text-purple-600 border-2 border-purple-200 rounded-2xl shadow-md py-6"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => onSignUpClick()}
              className="text-purple-500 hover:text-purple-700 text-sm"
            >
              New here? Get started! →
            </button>
          </div>
        </div>

        <p className="text-center text-purple-400 text-sm mt-6">
          Making chores less chore-ible since 2025 💜
        </p>
      </div>
    </div>
  );
}
