"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import {
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface AdminUserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  variant?: "light" | "dark";
}

export default function AdminUserMenu({ user, variant = "light" }: AdminUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = getInitials(displayName);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          variant === "dark"
            ? "hover:bg-white/10 focus:ring-white/50 focus:ring-offset-brand-navy"
            : "hover:bg-gray-100 focus:ring-brand-navy focus:ring-offset-white"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={displayName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-brand-purple flex items-center justify-center text-white font-medium text-sm">
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            {user.email && (
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
              Settings
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
