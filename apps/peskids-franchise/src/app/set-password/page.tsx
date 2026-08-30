"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [prospectName, setProspectName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Invalid or missing token");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/set-password?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setTokenValid(true);
          setProspectName(data.firstName);
        } else {
          setError(data.error || "Invalid or expired token");
        }
      } catch {
        setError("Failed to validate token");
      } finally {
        setIsLoading(false);
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to login with success message
        router.push("/login?message=password-set");
      } else {
        setError(data.error || "Failed to set password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="text-brand-navy">Validating your invite...</div>
      </div>
    );
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
          <span className="text-3xl font-bold text-brand-navy">
            Acme Franchise Franchising
          </span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">
          {!tokenValid ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error || "This invite link is invalid or has expired."}
              </div>
              <p className="text-gray-600 mb-4">
                Please contact us if you need a new invite.
              </p>
              <Link
                href="/"
                className="text-brand-purple hover:text-brand-navy font-medium"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">
                Welcome, {prospectName}!
              </h2>
              <p className="text-gray-600 mb-6">
                Set your password to access the franchise portal.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters.
                </p>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Set Password & Continue
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-light flex items-center justify-center">
          <div className="text-brand-navy">Loading...</div>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
