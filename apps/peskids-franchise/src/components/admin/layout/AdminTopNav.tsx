"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useAdminLayout } from "./AdminLayoutProvider";
import { visibleSectionConfigs } from "./sectionConfigs";
import AdminSearch from "../AdminSearch";
import AdminUserMenu from "../AdminUserMenu";
import NotificationsBellWrapper from "./NotificationsBellWrapper";

interface AdminTopNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onMenuClick: () => void;
}

export default function AdminTopNav({ user, onMenuClick }: AdminTopNavProps) {
  const { currentSection } = useAdminLayout();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center h-14 px-4 lg:px-6">
        {/* Left side - hamburger (mobile only) + logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <Link href="/admin" className="flex items-center gap-2.5">
            <Image
              src="/logo/logo.svg"
              alt="Acme Franchise"
              width={28}
              height={28}
              className="rounded-md"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-brand-navy font-semibold text-sm leading-tight">
                Franchisor
              </span>
              <span className="text-[10px] text-gray-500 leading-tight -mt-0.5">
                Admin Portal
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="hidden lg:block w-px h-6 bg-gray-200 ml-2" />
        </div>

        {/* Center - main navigation tabs */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-4" aria-label="Main navigation">
          {visibleSectionConfigs.map((section) => {
            const isActive = currentSection === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-brand-navy text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <section.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{section.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side - search + notifications + user menu */}
        <div className="flex items-center gap-1 ml-auto">
          <div className="hidden md:block">
            <AdminSearch variant="light" />
          </div>
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <NotificationsBellWrapper variant="light" />
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <AdminUserMenu user={user} variant="light" />
          </div>
          <div className="sm:hidden">
            <AdminUserMenu user={user} variant="light" />
          </div>
        </div>
      </div>

      {/* Mobile section navigation */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide border-t border-gray-100 bg-gray-50/50">
        <nav className="flex items-center gap-1 px-4 py-2 min-w-max" aria-label="Mobile navigation">
          {visibleSectionConfigs.map((section) => {
            const isActive = currentSection === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-brand-navy text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <section.icon className={`h-3.5 w-3.5 ${isActive ? "" : "text-gray-400"}`} />
                <span>{section.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
