"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import AcademySidebar from "./AcademySidebar";
import {
  HomeIcon,
  RocketLaunchIcon,
  BookOpenIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface AcademyLayoutProps {
  children: React.ReactNode;
  progress?: number;
  stats?: {
    points: number;
    badges: number;
    streak: number;
  };
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const mobileNavItems = [
  { name: "Dashboard", href: "/bootcamp", icon: HomeIcon },
  { name: "Journey", href: "/bootcamp/journey", icon: RocketLaunchIcon },
  { name: "Resources", href: "/bootcamp/resources", icon: BookOpenIcon },
  { name: "Coach", href: "/bootcamp/coach", icon: ChatBubbleLeftRightIcon },
  { name: "Achievements", href: "/bootcamp/achievements", icon: TrophyIcon },
];

export default function AcademyLayout({
  children,
  progress = 0,
  stats = { points: 0, badges: 0, streak: 0 },
  user,
}: AcademyLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const isActive = (href: string) => {
    if (href === "/bootcamp") {
      return pathname === "/bootcamp";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Full-width Header */}
      <header className="bg-gradient-to-r from-brand-navy via-[#3a3c9e] to-brand-navy shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Left: Mobile menu + Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5 text-white" />
            </button>

            {/* Logo & Title */}
            <Link href="/bootcamp" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/logo/logo.svg"
                  alt="Acme Franchise"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">
                  Operations Bootcamp
                </h1>
                <p className="text-xs text-blue-200 font-medium">
                  Acme Franchise
                </p>
              </div>
            </Link>
          </div>

          {/* Center: Progress */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Progress
            </span>
            <div className="w-32 lg:w-48 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#50C8DF] to-[#34B256] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white min-w-[3rem] text-right">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Right: Home + Notifications + Profile */}
          <div className="flex items-center gap-1">
            {/* Home Icon */}
            <Link
              href="/bootcamp"
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Bootcamp Home"
            >
              <HomeIcon className="h-5 w-5 text-white" />
            </Link>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors relative"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5 text-white" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  </div>
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    No new notifications
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title={user?.name || "Profile"}
              >
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="h-7 w-7 text-white" />
                )}
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {user?.name || "Franchisee"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/portal"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4 text-slate-400" />
                    Back to Portal
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 text-slate-400" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#50C8DF] to-[#34B256] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl lg:hidden transform transition-transform duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-brand-navy to-[#3a3c9e]">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo/logo.svg"
                  alt="Acme Franchise"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <h2 className="text-base font-semibold text-white">
                  Bootcamp Menu
                </h2>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Stats */}
            <div className="flex items-center justify-around px-3 py-3 border-b border-slate-100 bg-slate-50">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                  <span className="text-amber-500">&#9733;</span>
                  {stats.points.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Points</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                  <span>&#127942;</span>
                  {stats.badges}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Badges</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                  <span>&#128293;</span>
                  {stats.streak}
                </div>
                <div className="text-[9px] text-slate-500 uppercase">Streak</div>
              </div>
            </div>

            <nav className="p-4 space-y-1">
              {mobileNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? "bg-brand-navy/10 text-brand-navy font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-slate-200">
                <Link
                  href="/portal"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Back to Portal
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main Layout - Flexbox (sidebar + content) */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block flex-shrink-0 border-r border-slate-200 bg-white">
          <AcademySidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="h-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 pb-20 lg:pb-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-inset-bottom">
        <nav className="flex justify-around py-1.5">
          {mobileNavItems.slice(0, 5).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-2 py-1 ${
                  active ? "text-brand-navy" : "text-slate-500"
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-brand-navy" : ""}`} />
                <span className="text-[9px] mt-0.5 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
