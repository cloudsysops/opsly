"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";

const BASE_URL = "https://franchising.acmefranchise.com";

const SOURCE_PRESETS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "email", label: "Email" },
  { value: "newsletter", label: "Newsletter" },
];

const MEDIUM_PRESETS = [
  { value: "cpc", label: "CPC (Paid Click)" },
  { value: "social", label: "Social" },
  { value: "email", label: "Email" },
  { value: "display", label: "Display" },
  { value: "video", label: "Video" },
  { value: "story", label: "Story" },
  { value: "referral", label: "Referral" },
];

export function UTMBuilder() {
  const [params, setParams] = useState({
    page: "/",
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
  });
  const [copied, setCopied] = useState(false);

  const generatedUrl = (() => {
    const url = new URL(BASE_URL + params.page);
    if (params.source) url.searchParams.set("utm_source", params.source);
    if (params.medium) url.searchParams.set("utm_medium", params.medium);
    if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
    if (params.term) url.searchParams.set("utm_term", params.term);
    if (params.content) url.searchParams.set("utm_content", params.content);
    return url.toString();
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdate = (key: keyof typeof params, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Landing Page */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Landing Page
          </label>
          <select
            value={params.page}
            onChange={(e) => handleUpdate("page", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          >
            <option value="/">Home Page</option>
            <option value="/contact">Contact Page</option>
            <option value="/investment">Investment Page</option>
            <option value="/business-model">Business Model</option>
            <option value="/faq">FAQ</option>
            <option value="/testimonials">Testimonials</option>
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={params.source}
              onChange={(e) => handleUpdate("source", e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
            >
              <option value="">Select or type...</option>
              {SOURCE_PRESETS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={params.source}
              onChange={(e) => handleUpdate("source", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="Custom"
              className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Medium */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medium <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={params.medium}
              onChange={(e) => handleUpdate("medium", e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
            >
              <option value="">Select or type...</option>
              {MEDIUM_PRESETS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={params.medium}
              onChange={(e) => handleUpdate("medium", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="Custom"
              className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Campaign */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={params.campaign}
            onChange={(e) => handleUpdate("campaign", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="e.g., spring_2026_launch"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>

        {/* Term */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term <span className="text-gray-400 font-normal">(keyword)</span>
          </label>
          <input
            type="text"
            value={params.term}
            onChange={(e) => handleUpdate("term", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="e.g., chess_franchise"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content <span className="text-gray-400 font-normal">(ad variant)</span>
          </label>
          <input
            type="text"
            value={params.content}
            onChange={(e) => handleUpdate("content", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="e.g., headline_a, video_1"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>
      </div>

      {/* Generated URL */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Generated URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={generatedUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm font-mono text-gray-600"
          />
          <Button
            onClick={handleCopy}
            variant={copied ? "secondary" : "primary"}
            className="min-w-[100px]"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        {!params.source && (
          <p className="mt-2 text-sm text-orange-600">
            ⚠️ Source is required for tracking to work
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-sm text-gray-500 mr-2">Quick presets:</span>
        <button
          onClick={() => setParams({ page: "/contact", source: "facebook", medium: "cpc", campaign: "", term: "", content: "" })}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
        >
          Facebook Ad
        </button>
        <button
          onClick={() => setParams({ page: "/", source: "google", medium: "cpc", campaign: "", term: "", content: "" })}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200"
        >
          Google Ad
        </button>
        <button
          onClick={() => setParams({ page: "/", source: "instagram", medium: "social", campaign: "", term: "", content: "" })}
          className="px-3 py-1 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200"
        >
          Instagram
        </button>
        <button
          onClick={() => setParams({ page: "/", source: "newsletter", medium: "email", campaign: "", term: "", content: "" })}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
        >
          Email Newsletter
        </button>
      </div>
    </div>
  );
}
