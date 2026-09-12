# Commerce & Deals Governance

This package normalizes external commerce/deal provider payloads. It does not scrape sites, purchase products, move money or own the canonical revenue ledger.

## Boundaries

- Medusa remains the commerce/catalog/order product.
- changedetection.io remains the approved page/price/restock watcher.
- Shlink remains the short-link/click-attribution product.
- Opsly Revenue Core remains the canonical partner/referral/commission ledger.
- Use official APIs/feeds where available.
- A changed page is not automatically a sellable deal; only bounded event types such as price drops/restocks are eligible for downstream review.
- Never embed API keys/secrets in attribution metadata or URLs.
- No automatic purchasing.
