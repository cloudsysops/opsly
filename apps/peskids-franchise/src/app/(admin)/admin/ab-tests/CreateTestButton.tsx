"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";

interface Variant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, string>;
}

export default function CreateTestButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    targetPage: "/",
    element: "",
    trafficPercent: 100,
    variants: [
      { id: "control", name: "Control", weight: 50, config: { value: "" } },
      { id: "variant-a", name: "Variant A", weight: 50, config: { value: "" } },
    ] as Variant[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    const newId = `variant-${String.fromCharCode(97 + formData.variants.length - 1)}`;
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        {
          id: newId,
          name: `Variant ${String.fromCharCode(65 + formData.variants.length - 1)}`,
          weight: 0,
          config: { value: "" },
        },
      ],
    });
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 2) return;
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        + New Test
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-brand-navy">Create A/B Test</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: autoSlug(e.target.value),
                  })
                }
                placeholder="e.g., Homepage Hero Test"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., homepage-hero"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent font-mono text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What are you testing? What's the hypothesis?"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Page <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.targetPage}
                onChange={(e) => setFormData({ ...formData, targetPage: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="/">Home Page</option>
                <option value="/contact">Contact Page</option>
                <option value="/investment">Investment Page</option>
                <option value="/business-model">Business Model</option>
                <option value="/faq">FAQ Page</option>
                <option value="/testimonials">Testimonials</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Element <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.element}
                onChange={(e) => setFormData({ ...formData, element: e.target.value })}
                placeholder="e.g., hero-headline, cta-button"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Traffic Allocation: {formData.trafficPercent}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={formData.trafficPercent}
              onChange={(e) =>
                setFormData({ ...formData, trafficPercent: parseInt(e.target.value) })
              }
              className="w-full accent-brand-cyan"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.trafficPercent}% of visitors will be included in the test
            </p>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Variants
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-brand-cyan hover:text-brand-purple"
              >
                + Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {formData.variants.map((variant, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(i, "name", e.target.value)}
                      placeholder="Variant name"
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={variant.weight}
                        onChange={(e) => updateVariant(i, "weight", parseInt(e.target.value) || 0)}
                        min={0}
                        max={100}
                        className="w-16 px-2 py-1 border rounded text-sm text-center"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                    {formData.variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={variant.config.value || ""}
                    onChange={(e) =>
                      updateVariant(i, "config", { value: e.target.value })
                    }
                    placeholder="Value (e.g., different headline text)"
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Weights should sum to 100%. Currently:{" "}
              <span className={formData.variants.reduce((sum, v) => sum + v.weight, 0) === 100 ? "text-brand-green" : "text-red-500"}>
                {formData.variants.reduce((sum, v) => sum + v.weight, 0)}%
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Test"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
