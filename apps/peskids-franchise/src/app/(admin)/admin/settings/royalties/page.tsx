import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";

export const dynamic = "force-dynamic";

async function getRoyaltyConfig() {
  // Get the global default config (no franchiseeAccountId)
  const globalConfig = await db.royaltyConfig.findFirst({
    where: {
      franchiseeAccountId: null,
    },
  });

  // Get franchisee-specific overrides
  const overrides = await db.royaltyConfig.findMany({
    where: {
      franchiseeAccountId: { not: null },
    },
    include: {
      franchiseeAccount: {
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
              preferredTerritory: true,
            },
          },
        },
      },
    },
  });

  return {
    global: globalConfig || {
      royaltyPercent: 7.0,
      brandFundPercent: 1.0,
      systemsFeePercent: 2.0,
    },
    overrides,
  };
}

export default async function RoyaltiesSettingsPage() {
  const config = await getRoyaltyConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          Royalty Configuration
        </h1>
        <p className="mt-1 text-gray-600">
          Set royalty percentages and fee structures
        </p>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Default Fee Structure
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-brand-green/5 rounded-lg">
              <p className="text-sm text-gray-500">Royalty Fee</p>
              <p className="text-2xl font-bold text-brand-green">
                {Number(config.global.royaltyPercent)}%
              </p>
            </div>
            <div className="p-4 bg-brand-cyan/5 rounded-lg">
              <p className="text-sm text-gray-500">Brand Fund</p>
              <p className="text-2xl font-bold text-brand-cyan">
                {Number(config.global.brandFundPercent)}%
              </p>
            </div>
            <div className="p-4 bg-brand-purple/5 rounded-lg">
              <p className="text-sm text-gray-500">Systems Fee</p>
              <p className="text-2xl font-bold text-brand-purple">
                {Number(config.global.systemsFeePercent)}%
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Total:</strong>{" "}
              {Number(config.global.royaltyPercent) +
                Number(config.global.brandFundPercent) +
                Number(config.global.systemsFeePercent)}
              % of gross revenue
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Franchisee Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">
              Franchisee Overrides
            </h2>
            <span className="text-sm text-gray-500">
              {config.overrides.length} override
              {config.overrides.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {config.overrides.length > 0 ? (
            <div className="divide-y">
              {config.overrides.map((override) => (
                <div
                  key={override.id}
                  className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {override.franchiseeAccount?.prospect.firstName}{" "}
                      {override.franchiseeAccount?.prospect.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {override.franchiseeAccount?.prospect.preferredTerritory}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {Number(override.royaltyPercent) +
                        Number(override.brandFundPercent) +
                        Number(override.systemsFeePercent)}
                      % total
                    </p>
                    <p className="text-xs text-gray-500">
                      {Number(override.royaltyPercent)}% /{" "}
                      {Number(override.brandFundPercent)}% /{" "}
                      {Number(override.systemsFeePercent)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No custom fee structures. All franchisees use the default rates.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Fee Structure Details
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900">Royalty Fee (7%)</p>
              <p>
                Core franchise fee paid for use of the Acme Franchise brand,
                curriculum, and ongoing support.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Brand Fund (1%)</p>
              <p>
                Contributes to national marketing efforts and brand development
                initiatives.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Systems Fee (2%)</p>
              <p>
                Covers technology infrastructure including TutorCruncher,
                scheduling systems, and the Hub.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
