"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          {isSubmitted ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                Check your email for a password reset link.
              </div>
              <p className="text-gray-600 mb-4">
                If an account exists with that email, you&apos;ll receive
                instructions to reset your password.
              </p>
              <Link
                href="/login"
                className="text-brand-purple hover:text-brand-navy font-medium"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-brand-navy mb-2">
                Forgot your password?
              </h2>
              <p className="text-gray-600 mb-6">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Send Reset Link
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-brand-purple hover:text-brand-navy font-medium"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
