/**
 * External capability contracts. Implementations live outside this package.
 * Domain models never store vendor-specific ids as required fields.
 */

export type SignatureRequest = {
  agreementId: string;
  documentUri: string;
  signers: Array<{ email: string; name: string }>;
};

export type SignatureProvider = {
  readonly vendor: string;
  createEnvelope(request: SignatureRequest): Promise<{ externalId: string }>;
};

export type GeocodeQuery = { query: string; countryCode?: string };

export type MapProvider = {
  readonly vendor: string;
  geocode(query: GeocodeQuery): Promise<{ lat: number; lng: number } | null>;
};

export type RoyaltyPayoutRequest = {
  calculationId: string;
  amountMinor: number;
  currency: string;
};

export type RoyaltyPaymentProvider = {
  readonly vendor: string;
  payout(request: RoyaltyPayoutRequest): Promise<{ externalReference: string }>;
};

export type UnavailableProvider<T extends string> = {
  readonly vendor: T;
  readonly reason: 'missing_credentials' | 'not_configured';
};

export function missingMapProvider(): UnavailableProvider<'none'> {
  return { vendor: 'none', reason: 'not_configured' };
}
