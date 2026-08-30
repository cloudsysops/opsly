import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import {
  CheckCircleIcon,
  XCircleIcon,
  ServerStackIcon,
  CreditCardIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function getIntegrationStatus() {
  return {
    stripe: {
      connected: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    tutorCruncher: {
      masterConnected: !!process.env.TC_MASTER_TOKEN,
      westsideConnected: !!process.env.TC_WESTSIDE_TOKEN,
    },
    stcDatabases: {
      westsideConnected: !!process.env.STC_WESTSIDE_DATABASE_URL,
      eastsideConnected: !!process.env.STC_EASTSIDE_DATABASE_URL,
    },
  };
}

export default function IntegrationsSettingsPage() {
  const status = getIntegrationStatus();

  const integrations = [
    {
      name: "Stripe Connect",
      description: "Payment processing for royalty collection",
      icon: CreditCardIcon,
      connected: status.stripe.connected,
      details: [
        {
          label: "API Connection",
          connected: status.stripe.connected,
        },
        {
          label: "Webhook",
          connected: status.stripe.webhookConfigured,
        },
      ],
    },
    {
      name: "TutorCruncher",
      description: "Franchisee operations and revenue data",
      icon: ServerStackIcon,
      connected: status.tutorCruncher.masterConnected,
      details: [
        {
          label: "Master Instance",
          connected: status.tutorCruncher.masterConnected,
        },
        {
          label: "Westside Instance",
          connected: status.tutorCruncher.westsideConnected,
        },
      ],
    },
    {
      name: "STC Databases",
      description: "Direct database connections for revenue queries",
      icon: CircleStackIcon,
      connected:
        status.stcDatabases.westsideConnected ||
        status.stcDatabases.eastsideConnected,
      details: [
        {
          label: "Westside",
          connected: status.stcDatabases.westsideConnected,
        },
        {
          label: "Eastside",
          connected: status.stcDatabases.eastsideConnected,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Integrations</h1>
        <p className="mt-1 text-gray-600">
          Manage third-party service connections
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-navy/10">
                    <integration.icon className="h-5 w-5 text-brand-navy" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy">
                      {integration.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {integration.description}
                    </p>
                  </div>
                </div>
                {integration.connected ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {integration.details.map((detail) => (
                  <div
                    key={detail.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{detail.label}</span>
                    {detail.connected ? (
                      <span className="text-green-600 font-medium">
                        Connected
                      </span>
                    ) : (
                      <span className="text-gray-400">Not configured</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Environment Variables
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            Integration credentials are configured via environment variables in
            Heroku. Contact Doug to update these settings.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-mono text-gray-500">
              # Required for Stripe
              <br />
              STRIPE_SECRET_KEY=sk_...
              <br />
              STRIPE_WEBHOOK_SECRET=whsec_...
              <br />
              <br />
              # Required for TutorCruncher
              <br />
              TC_MASTER_TOKEN=...
              <br />
              TC_WESTSIDE_TOKEN=...
              <br />
              <br />
              # Required for STC Databases
              <br />
              STC_WESTSIDE_DATABASE_URL=postgres://...
              <br />
              STC_EASTSIDE_DATABASE_URL=postgres://...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
