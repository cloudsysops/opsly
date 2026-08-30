"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/Input";
import { cn } from "@/lib/utils";

const interestOptions = [
  { value: "ready", label: "Ready to start" },
  { value: "considering", label: "Seriously considering" },
  { value: "exploring", label: "Just exploring" },
];

export function StickyRequestInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fddAcknowledged, setFddAcknowledged] = useState(false);
  const pathname = usePathname();

  // Don't show on contact page (redundant) or on mobile
  const isContactPage = pathname === "/contact";

  // Reset submitted state when closing
  useEffect(() => {
    if (!isOpen && submitted) {
      // Keep submitted state for 5 seconds after closing, then reset
      const timer = setTimeout(() => setSubmitted(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, submitted]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("stickyFirstName"),
      lastName: formData.get("stickyLastName"),
      email: formData.get("stickyEmail"),
      phone: formData.get("stickyPhone"),
      preferredTerritory: formData.get("stickyTerritory"),
      interestLevel: formData.get("stickyInterest"),
      referralSource: "Sticky Request Form",
    };

    try {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Don't render on contact page
  if (isContactPage) return null;

  return (
    <>
      {/* Sticky button - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block fixed right-0 top-1/2 -translate-y-1/2 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center bg-brand-purple hover:bg-brand-navy text-white font-semibold transition-all duration-300 rounded-l-lg shadow-lg"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            <span className="px-3 py-6 tracking-wide">Request Info</span>
            <span className="bg-brand-cyan text-brand-navy px-3 py-2 rounded-bl-lg">
              <svg
                className="w-5 h-5 rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </button>
        )}
      </div>

      {/* Floating modal */}
      {isOpen && (
        <div className="hidden lg:flex fixed inset-0 z-50 items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating Card */}
          <div className="relative w-96 max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-purple to-brand-navy p-5 text-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl">Request Information</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-white/80 mt-1">
                Get franchise details sent directly to you
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-full bg-brand-green/10 mb-4">
                    <svg
                      className="h-7 w-7 text-brand-green"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-brand-navy mb-2">
                    Thank You!
                  </h4>
                  <p className="text-gray-600">
                    We&apos;ll be in touch within 24-48 hours.
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mt-6 text-brand-purple hover:text-brand-navy font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="stickyFirstName"
                      name="stickyFirstName"
                      label="First Name *"
                      required
                      autoComplete="given-name"
                      className="text-sm rounded-xl"
                    />
                    <Input
                      id="stickyLastName"
                      name="stickyLastName"
                      label="Last Name *"
                      required
                      autoComplete="family-name"
                      className="text-sm rounded-xl"
                    />
                  </div>

                  <Input
                    id="stickyEmail"
                    name="stickyEmail"
                    type="email"
                    label="Email *"
                    required
                    autoComplete="email"
                    className="text-sm rounded-xl"
                  />

                  <Input
                    id="stickyPhone"
                    name="stickyPhone"
                    type="tel"
                    label="Phone *"
                    required
                    autoComplete="tel"
                    className="text-sm rounded-xl"
                  />

                  <Input
                    id="stickyTerritory"
                    name="stickyTerritory"
                    label="Preferred Territory *"
                    placeholder="City, State"
                    required
                    className="text-sm rounded-xl"
                  />

                  <Select
                    id="stickyInterest"
                    name="stickyInterest"
                    label="Interest Level *"
                    options={interestOptions}
                    required
                    className="text-sm rounded-xl"
                  />

                  {/* FDD Acknowledgment Checkbox */}
                  <div className="bg-brand-light/50 rounded-xl p-3 border border-brand-cyan/20">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fddAcknowledged}
                        onChange={(e) => setFddAcknowledged(e.target.checked)}
                        className={cn(
                          "mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-purple",
                          "focus:ring-brand-purple focus:ring-offset-0"
                        )}
                        required
                      />
                      <span className="text-xs text-gray-700 leading-relaxed">
                        I understand that this is not an offer to sell a franchise and that I will
                        receive a Franchise Disclosure Document (FDD) at least 14 days before signing
                        any agreement or paying any fees. <span className="text-brand-purple">*</span>
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl"
                    isLoading={isSubmitting}
                    disabled={!fddAcknowledged}
                  >
                    Send Me Info
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    No obligation. We respect your privacy.
                  </p>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-brand-light/50 rounded-b-3xl space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Or chat with{" "}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-brand-purple font-medium hover:underline"
                >
                  Earl the Squirrel
                </button>{" "}
                for quick answers
              </p>
              <p className="text-[9px] text-gray-400 text-center leading-relaxed">
                This is not a franchise offering. An offer can only be made through a Franchise Disclosure Document.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
