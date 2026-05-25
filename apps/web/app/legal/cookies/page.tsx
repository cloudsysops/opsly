import type { Metadata } from 'next'
import { OpslyLegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Cookie Policy · Opsly',
}

export default function CookiesPage(): React.ReactElement {
  return (
    <OpslyLegalPageLayout
      title="Cookie Policy"
      version="1.0"
      effectiveDate="May 24, 2026"
    >
      <p>
        This Cookie Policy explains how Opsly uses cookies and similar technologies on
        our website (opsly.io) and the Opsly platform.
      </p>

      <section>
        <h2>1. What Are Cookies</h2>
        <p>
          Cookies are small text files placed on your device by a website. We also use
          browser <code>localStorage</code> and <code>sessionStorage</code> for
          application state. None of the cookies listed below are sold or shared with
          advertisers.
        </p>
      </section>

      <section>
        <h2>2. Cookies We Use</h2>

        <h3>Strictly Necessary</h3>
        <p>
          Required for the platform to function. Cannot be disabled without breaking
          core functionality.
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-access-token</code></td>
              <td>Supabase</td>
              <td>Authenticated session token</td>
              <td>1 hour</td>
            </tr>
            <tr>
              <td><code>sb-refresh-token</code></td>
              <td>Supabase</td>
              <td>Session renewal</td>
              <td>7 days</td>
            </tr>
            <tr>
              <td><code>__stripe_mid</code></td>
              <td>Stripe</td>
              <td>Fraud prevention during checkout</td>
              <td>1 year</td>
            </tr>
            <tr>
              <td><code>__stripe_sid</code></td>
              <td>Stripe</td>
              <td>Checkout session state</td>
              <td>30 minutes</td>
            </tr>
          </tbody>
        </table>

        <h3>Functional</h3>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Storage</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>opsly-theme</code></td>
              <td>localStorage</td>
              <td>UI theme preference</td>
              <td>Persistent</td>
            </tr>
            <tr>
              <td><code>opsly-cookie-consent</code></td>
              <td>localStorage</td>
              <td>Cookie banner dismissal</td>
              <td>365 days</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. What We Do Not Use</h2>
        <ul>
          <li><strong>Advertising/tracking pixels:</strong> no Meta Pixel, Google Ads, TikTok, or similar.</li>
          <li><strong>Cross-site behavioral tracking:</strong> no third-party analytics that tracks you across websites.</li>
          <li><strong>Fingerprinting:</strong> we do not use canvas or device fingerprinting.</li>
        </ul>
        <p>
          The Opsly public site does not use Google Analytics or any third-party analytics
          service that sets cookies.
        </p>
      </section>

      <section>
        <h2>4. Managing Cookies</h2>
        <p>
          You can control cookies through your browser settings. Note that disabling
          strictly necessary cookies will prevent login and core platform functions.
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Firefox</a></li>
          <li><a href="https://support.apple.com/en-us/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        </ul>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Questions: <a href="mailto:privacy@opsly.io">privacy@opsly.io</a><br />
          Governing law: State of Delaware, United States.
        </p>
      </section>
    </OpslyLegalPageLayout>
  )
}
