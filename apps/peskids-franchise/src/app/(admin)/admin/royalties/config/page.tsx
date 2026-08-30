'use client';

import Link from 'next/link';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function RoyaltyConfigPage() {
  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/royalties"
          className="inline-flex items-center gap-2 text-brand-purple hover:underline text-sm mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Royalties
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
          Royalty Configuration
        </h1>
        <p className="mt-1 text-gray-600">
          Configure royalty rates and fee structure
        </p>
      </div>

      {/* Current Configuration */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Current Fee Structure
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-brand-purple/10 rounded-lg p-4">
                <p className="text-sm text-gray-600">Royalty Fee</p>
                <p className="text-3xl font-bold text-brand-purple">7%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Core franchise royalty
                </p>
              </div>
              <div className="bg-brand-cyan/10 rounded-lg p-4">
                <p className="text-sm text-gray-600">Brand Fund</p>
                <p className="text-3xl font-bold text-brand-cyan">2%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Marketing & brand development
                </p>
              </div>
              <div className="bg-brand-orange/10 rounded-lg p-4">
                <p className="text-sm text-gray-600">Systems Fee</p>
                <p className="text-3xl font-bold text-brand-orange">1%</p>
                <p className="text-xs text-gray-500 mt-1">
                  Technology & operations
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  Total Fee Rate
                </span>
                <span className="text-2xl font-bold text-brand-navy">10%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Applied to monthly gross revenue from TutorCruncher/STC data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Configuration is locked
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Fee rates are defined in the Franchise Disclosure Document (FDD)
                and cannot be changed without legal review. Contact the
                franchising team if adjustments are needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
  );
}
