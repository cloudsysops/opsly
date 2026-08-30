"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "I've been coaching chess for over 15 years, and the Acme Franchise curriculum is hands-down the most engaging approach I've seen for young learners. My students are hooked from the very first lesson.",
    author: "Patricia Hernandez",
    role: "Chess Instructor & Parent",
    image: "https://i.pravatar.cc/300?img=47",
  },
  {
    quote:
      "Chess is such an important game for kids to learn. If you are interested in getting your tots involved, check out Acme Franchise. Our whole family plays together now!",
    author: "Marcus Bennett",
    role: "Austin, TX Parent",
    image: "https://i.pravatar.cc/300?img=12",
  },
  {
    quote:
      "My daughter had no prior chess experience and immediately fell in love with the storytelling style of teaching at the trial class. Now it's her favorite after-school activity and she can't wait for the next lesson. Definitely highly recommend it.",
    author: "Mei-Lin Wu",
    role: "Seattle, WA Parent",
    image: "https://i.pravatar.cc/300?img=23",
  },
  {
    quote:
      "Acme Franchise has our two children playing and loving chess! We're proud to have it in our home, and think every child should be learning with this program.",
    author: "Jordan Ellis",
    role: "Denver, CO Parent",
    image: "https://i.pravatar.cc/300?img=53",
  },
  {
    quote:
      "Acme Franchise provides such a well-developed curriculum that families instantly fall in love with. Running and growing a territory has been incredibly rewarding — watching kids have countless \"a-ha\" moments and hearing glowing reviews from parents makes it all worth it.",
    author: "Danielle Okafor",
    role: "Nashville Market Director",
    image: "https://i.pravatar.cc/300?img=44",
  },
  {
    quote:
      "Parents love the Acme Franchise curriculum. It creates real value for our school programs and why families stay with us. We've had parents refer their friends specifically because of our chess enrichment program.",
    author: "Raj Kapoor",
    role: "Academy Director",
    image: "https://i.pravatar.cc/300?img=68",
  },
  {
    quote:
      "Thanks for hosting a great week of summer camp. My kids seriously had the best time! They're obsessed with Acme Franchise and I'd love for them to continue with classes in the fall.",
    author: "Samantha Reed",
    role: "Charlotte, NC Parent",
    image: "https://i.pravatar.cc/300?img=32",
  },
  {
    quote:
      "My 5-year-old has been hooked since the first class. The staff and tutors have been incredibly welcoming, kind, and patient with our budding chess player. Can't wait to see him develop his skills in the months to come!",
    author: "Tanya Brooks",
    role: "Orlando, FL Parent",
    image: "https://i.pravatar.cc/300?img=26",
  },
];

function StarRating() {
  return (
    <div className="flex justify-center gap-1">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialCarousel() {
  const [startIndex, setStartIndex] = useState(0);

  // Auto-cycle every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(testimonials[(startIndex + i) % testimonials.length]);
    }
    return visible;
  };

  const goNext = () => {
    setStartIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goPrev = () => {
    setStartIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="bg-brand-purple py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white sm:text-4xl italic">
            The reviews are in!
          </h2>
        </div>

        <div className="relative">
          {/* Previous Button - hidden on small screens, positioned better on mobile */}
          <button
            onClick={goPrev}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 lg:-translate-x-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-purple shadow-lg items-center justify-center hover:bg-brand-navy transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Testimonials Grid - show only 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-0 sm:px-8">
            {getVisibleTestimonials().map((testimonial, index) => (
              <div
                key={`${startIndex}-${index}`}
                className={`flex flex-col items-center text-center animate-fade-in ${
                  index > 0 ? "hidden md:flex" : ""
                }`}
              >
                {/* Image */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-xl">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Stars */}
                <StarRating />

                {/* Name */}
                <h3 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-white">
                  {testimonial.author}
                </h3>

                {/* Role */}
                <p className="text-sm sm:text-base text-white/80 italic">
                  {testimonial.role}
                </p>

                {/* Quote */}
                <p className="mt-3 sm:mt-4 text-white/90 text-xs sm:text-sm leading-relaxed px-4 sm:px-0">
                  &quot;{testimonial.quote}&quot;
                </p>
              </div>
            ))}
          </div>

          {/* Next Button - hidden on small screens */}
          <button
            onClick={goNext}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 lg:translate-x-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-purple shadow-lg items-center justify-center hover:bg-brand-navy transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Arrows */}
        <div className="flex sm:hidden justify-center gap-4 mt-4">
          <button
            onClick={goPrev}
            className="flex w-11 h-11 rounded-full bg-white/20 items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Previous testimonial"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="flex w-11 h-11 rounded-full bg-white/20 items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Next testimonial"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Navigation Dots */}
        <div className="mt-4 sm:mt-6 flex justify-center gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setStartIndex(index)}
              className={`h-3 w-3 sm:h-2 sm:w-2 rounded-full transition-colors ${
                index === startIndex ? "bg-white" : "bg-white/30"
              }`}
            >
              <span className="sr-only">Go to testimonial {index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
