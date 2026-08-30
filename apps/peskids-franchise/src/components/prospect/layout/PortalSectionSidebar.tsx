"use client";

import React from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePortalLayout } from "./PortalLayoutProvider";
import { isPortalNavGroup, type PortalNavItem } from "./portalSectionConfigs";

interface PortalSectionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLinkProps {
  item: PortalNavItem;
  isActive: (href: string) => boolean;
  onClose: () => void;
}

function NavLink({ item, isActive, onClose }: NavLinkProps) {
  const active = isActive(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        active
          ? "bg-brand-navy/8 text-brand-navy font-medium"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-cyan rounded-r-full" />
      )}
      <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-brand-navy" : "text-slate-400"}`} />
      <span className="text-sm font-body">{item.name}</span>
    </Link>
  );
}

export default function PortalSectionSidebar({ isOpen, onClose }: PortalSectionSidebarProps) {
  const { sectionConfig, isActive } = usePortalLayout();

  // Home section has no sidebar — full-width dashboard
  if (sectionConfig.sidebarItems.length === 0) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
        <div className="p-1.5 rounded-lg bg-brand-navy/10">
          <sectionConfig.icon className="h-5 w-5 text-brand-navy" />
        </div>
        <span className="font-display font-semibold text-slate-900">{sectionConfig.name}</span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Section navigation">
        {sectionConfig.sidebarItems.map((item, index) => {
          if (isPortalNavGroup(item)) {
            return (
              <div key={item.groupName} className={index > 0 ? "pt-4" : ""}>
                <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>
    </>
  );
}
