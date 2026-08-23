import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import {
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function getEmailStatus() {
  const hasPostmark = !!process.env.POSTMARK_API_KEY;
  const hasGmail =
    !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY) &&
    !!process.env.GMAIL_ADMIN_EMAILS;
  const fromEmail = "franchising@acmefranchise.com";

  return { hasPostmark, hasGmail, fromEmail };
}

export default function EmailSettingsPage() {
  const status = getEmailStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Email Configuration</h1>
        <p className="mt-1 text-gray-600">
          Email delivery providers and connection status
        </p>
      </div>

      {/* Postmark */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Postmark
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <EnvelopeIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Transactional Email</p>
                  <p className="text-sm text-gray-500">Password resets, admin alerts, system notifications</p>
                </div>
              </div>
              {status.hasPostmark ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Not configured</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">From Address</p>
              <p className="font-medium text-gray-900">{status.fromEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Gmail
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50">
                  <EnvelopeIcon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Personal / Introduction Emails</p>
                  <p className="text-sm text-gray-500">Vendor introductions sent on module completion. Appears in sender&apos;s Gmail sent folder.</p>
                </div>
              </div>
              {status.hasGmail ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Not configured</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Configure Gmail templates in Email Templates (set a TO address to enable Gmail delivery).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
