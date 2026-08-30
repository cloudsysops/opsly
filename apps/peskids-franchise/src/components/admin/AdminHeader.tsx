"use client";

import React from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import AdminSearch from "./AdminSearch";
import AdminUserMenu from "./AdminUserMenu";

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onMenuClick: () => void;
}

export default function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left side - hamburger (mobile only) */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Center - search bar */}
        <div className="flex-1 flex justify-center px-4 lg:px-8">
          <AdminSearch />
        </div>

        {/* Right side - user menu */}
        <div className="flex items-center">
          <AdminUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
