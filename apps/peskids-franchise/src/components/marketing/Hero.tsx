"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { XMarkIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { corporateMarkets, franchiseMarkets } from "./WorldMap";

// Dynamic import to avoid SSR issues with react-simple-maps
const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center bg-gradient-to-b from-blue-50 to-slate-100 rounded-xl">
      <div className="animate-pulse text-gray-400">Loading map...</div>
    </div>
  ),
});

const schoolLogos = [
  { src: "/images/school-logos/primrose.webp", alt: "Primrose Schools" },
  { src: "/images/school-logos/goddard.webp", alt: "Goddard School" },
  { src: "/images/school-logos/kiddie-academy.webp", alt: "Kiddie Academy" },
  { src: "/images/school-logos/lightbridge.png", alt: "Lightbridge Academy" },
  { src: "/images/school-logos/kindercare.svg", alt: "KinderCare" },
  { src: "/images/school-logos/learningcaregroup.svg", alt: "Learning Care Group" },
  { src: "/images/school-logos/avenues.svg", alt: "Avenues" },
  { src: "/images/school-logos/nypubliclibrary.svg", alt: "New York Public Library" },
  { src: "/images/school-logos/wms-logo.svg", alt: "Williamsburg Montessori School" },
];

const stats = [
  { label: "Active Markets", value: "7", suffix: "", clickable: true },
  { label: "Students Taught", value: "50,000", suffix: "+", clickable: false },
  { label: "Partner Schools", value: "600", suffix: "+", clickable: false },
  { label: "Years Experience", value: "15", suffix: "+", clickable: false },
];


export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked - that's ok, we have a fallback
      });
    }
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMapModal(false);
    };
    if (showMapModal) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showMapModal]);

  return (
    <div className="relative overflow-hidden">
      {/* Video/Image Background */}
      <div className="absolute inset-0 -z-10">
        {/* Fallback gradient if video doesn't load */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-purple to-brand-navy" />

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/videos/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/60 to-brand-navy/80" />
      </div>

      {/* Main Hero Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-6 sm:pt-28 sm:pb-10 lg:pt-36 lg:pb-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Inspire Young Minds
            <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-yellow bg-clip-text text-transparent">
              Build a Business You Love
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-4 sm:mt-6 text-base sm:text-xl leading-7 sm:leading-8 text-white/80 max-w-2xl mx-auto px-2">
            Join the Peskids Franchise family. Build a rewarding business
            teaching children ages 3-8 with our proven, story-based curriculum.
          </p>

          {/* CTAs */}
          <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link
              href="/contact"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-brand-navy bg-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-center"
            >
              Start Your Journey
            </Link>
            <Link
              href="/business-model"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 hover:border-white/50 transition-all duration-200 text-center"
            >
              How It Works
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 sm:mt-12 mx-auto max-w-4xl px-2 sm:px-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                onClick={stat.clickable ? () => setShowMapModal(true) : undefined}
                className={`text-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 ${
                  stat.clickable
                    ? "cursor-pointer hover:bg-white/10 hover:border-brand-cyan/50 hover:scale-105 transition-all duration-200"
                    : ""
                }`}
              >
                <div className="text-2xl sm:text-4xl font-bold text-white">
                  {stat.value}
                  <span className="text-brand-cyan">{stat.suffix}</span>
                </div>
                <div className="mt-1 text-xs sm:text-sm text-white/60">
                  {stat.label}
                  {stat.clickable && (
                    <span className="block text-[10px] text-brand-cyan mt-0.5">Click to view map</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Characters - pinned to bottom of hero */}
      <div className="relative z-10 -mb-12 sm:-mb-16 lg:-mb-20">
        <Image
          src="/images/characters/team-illustration.svg"
          alt="Peskids Franchise Characters"
          width={900}
          height={150}
          className="mx-auto h-24 sm:h-32 lg:h-40 w-auto drop-shadow-2xl"
          priority
        />
      </div>

      {/* Trusted By Schools */}
      <div className="bg-white pt-12 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6 sm:mb-8">
            Trusted by leading schools nationwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-4 sm:gap-y-8">
            {schoolLogos.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={140}
                height={60}
                className="h-8 sm:h-12 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowMapModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-brand-navy to-brand-purple">
              <div>
                <h2 className="text-xl font-bold text-white">Our Global Presence</h2>
                <p className="text-sm text-white/70">7 markets across 3 continents</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Map Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Interactive World Map */}
              <WorldMap />

              {/* Legend and Market Lists */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {/* Corporate Markets */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded-full bg-brand-purple shadow-sm"></div>
                    <h3 className="font-semibold text-brand-navy">Corporate Markets</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Owned and operated by Peskids Franchise
                  </p>
                  <div className="space-y-2">
                    {corporateMarkets.map((market, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPinIcon className="h-4 w-4 text-brand-purple flex-shrink-0" />
                        <span>{market.name}</span>
                        {market.region && <span className="text-gray-400">{market.region}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Franchise Markets */}
                <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded-full bg-brand-cyan shadow-sm"></div>
                    <h3 className="font-semibold text-brand-navy">Franchise Partners</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Operated by independent franchise owners
                  </p>
                  <div className="space-y-2">
                    {franchiseMarkets.map((market, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPinIcon className="h-4 w-4 text-brand-cyan flex-shrink-0" />
                        <span>{market.name}</span>
                        {market.region && <span className="text-gray-400">{market.region}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Interested in bringing Peskids Franchise to your area?
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-navy text-white rounded-full font-medium hover:bg-brand-purple transition-colors"
                  onClick={() => setShowMapModal(false)}
                >
                  Inquire About Your Market
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
