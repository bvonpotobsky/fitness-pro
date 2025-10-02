"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, signUp } from "~/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp.email({
          email,
          password,
          name,
        });
        router.push("/");
      } else {
        await signIn.email({
          email,
          password,
        });
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-[3rem]">
          {isSignUp ? "Sign Up" : "Sign In"}
        </h1>

        <div className="w-full max-w-md rounded-xl bg-white/10 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-lg bg-white/20 px-4 py-2 text-white placeholder-white/50 outline-none focus:bg-white/30"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg bg-white/20 px-4 py-2 text-white placeholder-white/50 outline-none focus:bg-white/30"
                placeholder="Enter your email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-lg bg-white/20 px-4 py-2 text-white placeholder-white/50 outline-none focus:bg-white/30"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20 disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#15162c] px-2 text-white/70">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signIn.social({ provider: "google" })}
              className="rounded-full bg-white/10 px-10 py-3 text-center font-semibold transition hover:bg-white/20"
            >
              Google
            </button>
          </div>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-white/70 underline hover:text-white"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-white/70 underline hover:text-white"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
