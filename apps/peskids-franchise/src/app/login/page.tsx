"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAutoLogging, setIsAutoLogging] = useState(true);

  // Auto-login as demo user for portfolio demo mode
  useEffect(() => {
    (async () => {
      try {
        const result = await signIn("credentials", {
          email: "demo@acmefranchise.com",
          password: "demo",
          redirect: false,
        });
        if (!result?.error) {
          router.push(callbackUrl);
          router.refresh();
          return;
        }
      } catch {
        // Fall through to manual login
      }
      setIsAutoLogging(false);
    })();
  }, []);

  if (isAutoLogging) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  const successMessages: Record<string, string> = {
    "password-set": "Your password has been set. You can now sign in.",
    "password-reset": "Your password has been reset. You can now sign in.",
  };

  async function handleCredentialsLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setLoginError("Invalid email or password");
      setIsLoading(false);
    } else {
      window.location.href = callbackUrl;
    }
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/auth/callback" });
  }

  return (
    <div className="min-h-screen bg-brand-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex flex-col items-center gap-4">
          <Image
            src="/logo/logo.svg"
            alt="Acme Franchise"
            width={80}
            height={80}
            className="rounded-xl"
          />
          <span className="text-3xl font-bold text-brand-navy text-center">
            Acme Franchise Franchising
          </span>
        </Link>
        <h2 className="mt-4 text-center text-xl font-semibold text-brand-navy/80">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">
          {message && successMessages[message] && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessages[message]}
            </div>
          )}

          {(error || loginError) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {loginError || "Authentication failed. Please try again."}
            </div>
          )}

          {/* Prospect Login */}
          <form onSubmit={handleCredentialsLogin} className="space-y-6">
            <h3 className="text-lg font-semibold text-brand-navy">
              Franchise Portal
            </h3>

            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-brand-purple hover:text-brand-navy"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  @acmefranchise.com accounts
                </span>
              </div>
            </div>
          </div>

          {/* Google Login for STC accounts (admins + franchisees) */}
          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google (@acmefranchise.com)
            </Button>
            <p className="mt-2 text-xs text-center text-gray-500">
              For admins and franchisees with a @acmefranchise.com email
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/contact"
            className="text-brand-purple hover:text-brand-navy font-medium"
          >
            Submit an inquiry
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
