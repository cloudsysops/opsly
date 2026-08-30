"use client";

import React from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAdminLayout } from "./AdminLayoutProvider";
import { isNavGroup, type NavItem, type SidebarItem } from "./sectionConfigs";

interface AdminSectionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLinkProps {
  item: NavItem;
  isActive: (href: string) => boolean;
  onClose: () => void;
}

function NavLink({ item, isActive, onClose }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isActive(item.href)
          ? "bg-brand-navy/10 text-brand-navy font-medium"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.href) ? "text-brand-navy" : "text-gray-400"}`} />
      <span className="text-sm">{item.name}</span>
    </Link>
  );
}

export default function AdminSectionSidebar({ isOpen, onClose }: AdminSectionSidebarProps) {
  const { sectionConfig, isActive } = useAdminLayout();

  // Don't render sidebar if section has no sidebar items (e.g., Dashboard)
  if (sectionConfig.sidebarItems.length === 0) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Section title */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
        <sectionConfig.icon className="h-5 w-5 text-brand-navy" />
        <span className="font-semibold text-gray-900">{sectionConfig.name}</span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Section navigation">
        {sectionConfig.sidebarItems.map((item, index) => {
          if (isNavGroup(item)) {
            return (
              <div key={item.groupName} className={index > 0 ? "pt-4" : ""}>
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {item.groupName}
                </p>
                {item.items.map((navItem) => (
                  <NavLink key={navItem.href} item={navItem} isActive={isActive} onClose={onClose} />
                ))}
              </div>
            );
          }
          return <NavLink key={item.href} item={item} isActive={isActive} onClose={onClose} />;
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden transform transition-transform duration-300 shadow-xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 bg-white border-r border-gray-200">
        <SidebarContent />
      </aside>
    </>
  );
}
