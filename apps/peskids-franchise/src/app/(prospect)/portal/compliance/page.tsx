'use client';

import { useState, useEffect } from 'react';
import { WideContainer } from '@/components/shared/ResponsiveContainer';
import { Card, CardHeader, CardContent } from '@/components/shared/Card';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface CertificationEarned {
  id: string;
  earnedAt: string;
  expiresAt: string | null;
  status: string;
  documentUrl: string | null;
}

interface Certification {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  requiredForLaunch: boolean;
  renewalMonths: number | null;
  earned: CertificationEarned | null;
  status: string;
}

interface CategorySummary {
  name: string;
  completed: number;
  total: number;
  required: number;
  requiredComplete: number;
  progress: number;
}

interface ExpiringCert {
  id: string;
  name: string;
  expiresAt: string;
  daysUntil: number;
}

interface ExpiredCert {
  id: string;
  name: string;
  expiredAt: string;
}

interface ComplianceData {
  summary: {
    overallCompletion: number;
    requiredComplete: number;
    requiredTotal: number;
    totalCertifications: number;
    earnedCertifications: number;
    expiringSoon: number;
    expired: number;
    daysUntilNextExpiration: number | null;
    complianceScore: number;
  };
  categories: CategorySummary[];
  certifications: Certification[];
  expiring: ExpiringCert[];
  expired: ExpiredCert[];
}

const CATEGORY_ICONS: Record<string, string> = {
  Training: '📚',
  Insurance: '🛡️',
  Legal: '📋',
  Compliance: '✅',
  Background: '🔍',
};

export default function FranchiseeCompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  async function fetchComplianceData() {
    try {
      const res = await fetch('/api/franchisee/compliance/overview');
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setData(json);
      // Auto-expand first category with incomplete items
      const firstIncomplete = json.categories.find((c: CategorySummary) => c.completed < c.total);
      if (firstIncomplete) {
        setExpandedCategory(firstIncomplete.name);
      }
    } catch (err) {
      console.error('Error fetching compliance data:', err);
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }

  function openUploadModal(cert: Certification) {
    setSelectedCert(cert);
    setUploadUrl('');
    setShowUploadModal(true);
  }

  async function handleUpload() {
    if (!selectedCert) return;

    setUploading(true);
    try {
      const res = await fetch('/api/franchisee/compliance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId: selectedCert.id,
          documentUrl: uploadUrl || null,
        }),
      });

      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setShowUploadModal(false);
      setSelectedCert(null);
      setUploadUrl('');
      fetchComplianceData();
    } catch (err) {
      console.error('Error uploading:', err);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  if (error || !data) {
    return (
      <WideContainer className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Unable to load compliance data'}</p>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  const { summary, categories, certifications, expiring, expired } = data;

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-green-600" />
          Compliance Center
        </h1>
        <p className="mt-1 text-gray-600">
          Track your certifications and compliance requirements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={summary.overallCompletion === 100 ? 'border-green-300 bg-green-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className={`h-5 w-5 ${summary.overallCompletion === 100 ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Launch Requirements</span>
            </div>
            <p className={`text-2xl font-bold ${summary.overallCompletion === 100 ? 'text-green-600' : 'text-brand-navy'}`}>
              {summary.requiredComplete} / {summary.requiredTotal}
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.overallCompletion === 100 ? 'bg-green-500' : 'bg-brand-purple'
                }`}
                style={{ width: `${summary.overallCompletion}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={expiring.length > 0 ? 'border-amber-300 bg-amber-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className={`h-5 w-5 ${expiring.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Expiring Soon</span>
            </div>
            <p className={`text-2xl font-bold ${expiring.length > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
              {expiring.length}
            </p>
            {summary.daysUntilNextExpiration && (
              <p className="text-xs text-amber-600 mt-1">
                Next in {summary.daysUntilNextExpiration} days
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={expired.length > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircleIcon className={`h-5 w-5 ${expired.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Expired</span>
            </div>
            <p className={`text-2xl font-bold ${expired.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {expired.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="h-5 w-5 text-brand-purple" />
              <span className="text-sm text-gray-500">Total Certifications</span>
            </div>
            <p className="text-2xl font-bold text-brand-navy">
              {summary.earnedCertifications} / {summary.totalCertifications}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(expiring.length > 0 || expired.length > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Action Required</span>
            </div>
            <div className="space-y-2">
              {expired.map((cert) => (
                <div key={cert.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-200">
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{cert.name}</span>
                    <span className="text-red-600 ml-2 text-sm">Expired</span>
                  </div>
                  <button
                    onClick={() => {
                      const c = certifications.find((x) => x.id === cert.id.split('-')[0]);
                      if (c) openUploadModal(c);
                    }}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Renew
                  </button>
                </div>
              ))}
              {expiring.map((cert) => (
                <div key={cert.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200">
                  <ClockIcon className="h-5 w-5 text-amber-500" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{cert.name}</span>
                    <span className="text-amber-600 ml-2 text-sm">
                      Expires in {cert.daysUntil} day{cert.daysUntil !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors">
                    Renew
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Progress Overview */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Compliance Categories</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category) => {
            const isExpanded = expandedCategory === category.name;
            const categoryCerts = certifications.filter((c) => c.category === category.name);
            const icon = CATEGORY_ICONS[category.name] || '📄';

            return (
              <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {category.completed} of {category.total} complete
                        {category.required > 0 && (
                          <span className="ml-2 text-xs text-brand-purple">
                            ({category.requiredComplete}/{category.required} required)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          category.progress === 100 ? 'bg-green-500' : 'bg-brand-purple'
                        }`}
                        style={{ width: `${category.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {category.progress}%
                    </span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Certifications */}
                {isExpanded && (
                  <div className="p-4 space-y-3 border-t border-gray-200">
                    {categoryCerts.map((cert) => {
                      const isComplete = cert.earned && (cert.status === 'ACTIVE' || cert.status === 'EXPIRING_SOON');
                      const isExpiring = cert.status === 'EXPIRING_SOON';
                      const isExpired = cert.status === 'EXPIRED';

                      return (
                        <div
                          key={cert.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border ${
                            isExpired ? 'border-red-200 bg-red-50' :
                            isExpiring ? 'border-amber-200 bg-amber-50' :
                            isComplete ? 'border-green-200 bg-green-50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-full ${
                            isExpired ? 'bg-red-200' :
                            isExpiring ? 'bg-amber-200' :
                            isComplete ? 'bg-green-200' :
                            'bg-gray-200'
                          }`}>
                            {isExpired ? (
                              <XCircleIcon className="h-5 w-5 text-red-600" />
                            ) : isExpiring ? (
                              <ClockIcon className="h-5 w-5 text-amber-600" />
                            ) : isComplete ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-gray-900">{cert.name}</h4>
                              {cert.requiredForLaunch && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            {cert.description && (
                              <p className="text-sm text-gray-600 mt-1">{cert.description}</p>
                            )}
                            {cert.renewalMonths && (
                              <p className="text-xs text-gray-400 mt-1">
                                Renewal required every {cert.renewalMonths} months
                              </p>
                            )}
                            {cert.earned && (
                              <div className="mt-2 flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-gray-500">
                                  <CalendarDaysIcon className="h-4 w-4" />
                                  Earned: {new Date(cert.earned.earnedAt).toLocaleDateString()}
                                </span>
                                {cert.earned.expiresAt && (
                                  <span className={`flex items-center gap-1 ${
                                    isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-gray-500'
                                  }`}>
                                    Expires: {new Date(cert.earned.expiresAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isComplete && (
                              <button
                                onClick={() => openUploadModal(cert)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                <ArrowUpTrayIcon className="h-4 w-4" />
                                Upload
                              </button>
                            )}
                            {(isExpiring || isExpired) && (
                              <button
                                onClick={() => openUploadModal(cert)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                              >
                                Renew
                              </button>
                            )}
                            {cert.earned?.documentUrl && (
                              <a
                                href={cert.earned.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-brand-purple hover:underline text-center"
                              >
                                View Doc
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardContent className="py-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600">
            Contact{' '}
            <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
              franchising@acmefranchise.com
            </a>
            {' '}if you have questions about compliance requirements or need assistance uploading documents.
          </p>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCert.earned ? 'Renew' : 'Upload'} Certification
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="font-medium text-gray-900">{selectedCert.name}</p>
                {selectedCert.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedCert.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document URL (optional)
                </label>
                <input
                  type="text"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-brand-purple focus:border-brand-purple"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to your certificate document (Google Drive, Dropbox, etc.)
                </p>
              </div>
              {selectedCert.renewalMonths && (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  This certification will be set to expire in {selectedCert.renewalMonths} months.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-brand-purple text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Saving...' : selectedCert.earned ? 'Renew Certification' : 'Add Certification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
