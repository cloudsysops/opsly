'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  XMarkIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const ACTIONS = [
  {
    label: 'New Support Ticket',
    href: '/portal/support/new',
    icon: TicketIcon,
    color: 'bg-purple-600',
  },
  {
    label: 'View Messages',
    href: '/portal/messages',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-cyan-600',
  },
  {
    label: 'View Invoices',
    href: '/portal/royalties',
    icon: DocumentTextIcon,
    color: 'bg-amber-600',
  },
];

export default function MobileQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  function handleAction(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30 lg:hidden transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB container - hidden on desktop, positioned above bottom nav on mobile */}
      <div
        ref={containerRef}
        className="fixed right-4 z-[35] lg:hidden"
        style={{ bottom: '88px' }}
      >
        {/* Action buttons - expand upward */}
        <div
          className={`flex flex-col-reverse items-end gap-3 mb-3 transition-all duration-200 ${
            isOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {ACTIONS.map((action, index) => (
            <div
              key={action.href}
              className="flex items-center gap-3"
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
              }}
            >
              {/* Tooltip label */}
              <span className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900/90 rounded-lg shadow-lg whitespace-nowrap">
                {action.label}
              </span>

              {/* Action button */}
              <button
                onClick={() => handleAction(action.href)}
                className={`flex items-center justify-center w-11 h-11 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all ${action.color}`}
                aria-label={action.label}
              >
                <action.icon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 ${
            isOpen ? 'bg-gray-700 rotate-45' : ''
          }`}
          style={{
            backgroundColor: isOpen ? undefined : '#2D2F8E',
          }}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <XMarkIcon className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <PlusIcon className="w-6 h-6 transition-transform duration-200" />
          )}
        </button>
      </div>
    </>
  );
}
