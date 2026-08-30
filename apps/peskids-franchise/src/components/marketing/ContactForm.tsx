"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/Button";
import { Input, Textarea, Select } from "@/components/shared/Input";
import { cn } from "@/lib/utils";

const interestOptions = [
  { value: "ready", label: "Ready to start - just need the right opportunity" },
  { value: "funding", label: "Actively seeking funding" },
  { value: "considering", label: "Seriously considering a franchise" },
  { value: "exploring", label: "Just exploring options" },
  { value: "future", label: "Gathering information for the future" },
];

const liquidityOptions = [
  { value: "under_50k", label: "Under $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "100k_250k", label: "$100,000 - $250,000" },
  { value: "250k_500k", label: "$250,000 - $500,000" },
  { value: "over_500k", label: "Over $500,000" },
];

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fddAcknowledged, setFddAcknowledged] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Get session and visitor IDs from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem("earl_session_id");
    const storedVisitorId = localStorage.getItem("stc_visitor_id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
    if (storedVisitorId) {
      setVisitorId(storedVisitorId);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      preferredTerritory: formData.get("preferredTerritory"),
      interestLevel: formData.get("interestLevel"),
      liquidity: formData.get("liquidity"),
      aboutYourself: formData.get("aboutYourself"),
      referralSource: formData.get("referralSource"),
      sessionId: sessionId, // Pass Earl chat session for conversation linking
      visitorId: visitorId, // Pass visitor ID for visitor tracking linking
    };

    // Notify tracking system about form submission
    if (visitorId && sessionId) {
      fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "form_submit",
          visitorId,
          sessionId,
          data: { formType: "contact" },
        }),
      }).catch(() => {}); // Fire and forget
    }

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

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-brand-green/10 mb-6">
          <svg
            className="h-8 w-8 text-brand-green"
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
        <h3 className="text-2xl font-bold text-brand-navy mb-2">
          Thank You for Your Interest!
        </h3>
        <p className="text-gray-600">
          We&apos;ve received your inquiry and will be in touch within 24-48
          hours to discuss your franchise opportunity.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="firstName"
          name="firstName"
          label="First Name *"
          required
          autoComplete="given-name"
        />
        <Input
          id="lastName"
          name="lastName"
          label="Last Name *"
          required
          autoComplete="family-name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email *"
          required
          autoComplete="email"
        />
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Phone *"
          required
          autoComplete="tel"
        />
      </div>

      <Input
        id="preferredTerritory"
        name="preferredTerritory"
        label="Preferred Territory (City/State) *"
        placeholder="e.g., Austin, TX"
        required
      />

      <Select
        id="interestLevel"
        name="interestLevel"
        label="Where are you in your franchise journey? *"
        options={interestOptions}
        required
      />

      <Select
        id="liquidity"
        name="liquidity"
        label="Available Liquidity (Optional)"
        options={liquidityOptions}
      />

      <Textarea
        id="aboutYourself"
        name="aboutYourself"
        label="Tell us about yourself and why you're interested *"
        placeholder="Share your background, what draws you to children's education, and why Acme Franchise appeals to you..."
        required
      />

      <Input
        id="referralSource"
        name="referralSource"
        label="How did you hear about us?"
        placeholder="Google, friend, social media, etc."
      />

      {/* FDD Acknowledgment Checkbox */}
      <div className="bg-brand-light/50 rounded-lg p-4 border border-brand-cyan/20">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={fddAcknowledged}
            onChange={(e) => setFddAcknowledged(e.target.checked)}
            className={cn(
              "mt-1 h-5 w-5 rounded border-gray-300 text-brand-purple",
              "focus:ring-brand-purple focus:ring-offset-0"
            )}
            required
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I understand that this is not an offer to sell a franchise and that I will
            receive a Franchise Disclosure Document (FDD) at least 14 days before signing
            any agreement or paying any fees. <span className="text-brand-purple">*</span>
          </span>
        </label>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isSubmitting}
        disabled={!fddAcknowledged}
      >
        Submit Inquiry
      </Button>

      <p className="text-xs text-gray-500 text-center">
        By submitting this form, you agree to receive information about Story
        Time Chess franchise opportunities. We respect your privacy and will
        never share your information.
      </p>
    </form>
  );
}
