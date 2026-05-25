import type { Metadata } from 'next'
import { OpslyLegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Privacy Policy · Opsly',
}

export default function PrivacyPage(): React.ReactElement {
  return (
    <OpslyLegalPageLayout
      title="Privacy Policy"
      version="1.0"
      effectiveDate="May 24, 2026"
    >
      <p>
        This Privacy Policy describes how Opsly ("<strong>Opsly</strong>", "we", "us", or "our")
        collects, uses, and shares information about you when you use our platform and services.
        Opsly operates under the laws of the <strong>State of Delaware, United States</strong>.
      </p>

      <section>
        <h2>1. Information We Collect</h2>

        <h3>Account and Contact Information</h3>
        <p>When you sign up or manage your account:</p>
        <ul>
          <li>Name and email address of the account administrator.</li>
          <li>Company name and billing address.</li>
          <li>Payment information (processed by Stripe — we do not store card numbers).</li>
        </ul>

        <h3>Usage Data</h3>
        <ul>
          <li>API request logs (endpoint, timestamp, response status, latency).</li>
          <li>Feature usage metrics (anonymized or aggregated where possible).</li>
          <li>IP address and browser/user-agent (collected by Vercel edge network).</li>
        </ul>

        <h3>End-User Data (Tenant Responsibility)</h3>
        <p>
          If you use Opsly to build products for your own customers, Opsly processes that
          end-user data as a <strong>data processor</strong> on your behalf. You are the data
          controller and are responsible for the legal basis for that processing.
          See our <a href="/legal/terms">Terms of Service</a> and contact us for a Data
          Processing Addendum (DPA) if required by your jurisdiction.
        </p>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Provision and operation of the Opsly platform.</li>
          <li>Billing and payment processing.</li>
          <li>Customer support and responding to your requests.</li>
          <li>Security monitoring, abuse prevention, and fraud detection.</li>
          <li>Product analytics to improve the service (aggregated, not sold).</li>
          <li>Sending transactional emails (account activity, invoices, critical notices).</li>
          <li>
            Marketing communications — only with your prior consent (opt-in), and you may
            unsubscribe at any time.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Sub-Processors and Data Sharing</h2>
        <p>
          We share data with the following categories of service providers, each bound by
          contractual data processing terms:
        </p>
        <table>
          <thead>
            <tr>
              <th>Sub-Processor</th>
              <th>Purpose</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Supabase Inc.</td><td>Database and authentication</td><td>USA (AWS)</td></tr>
            <tr><td>Stripe Inc.</td><td>Payment processing</td><td>USA</td></tr>
            <tr><td>Vercel Inc.</td><td>Hosting and edge delivery</td><td>USA / Global CDN</td></tr>
            <tr><td>Doppler Systems Inc.</td><td>Secrets management</td><td>USA</td></tr>
            <tr><td>Cloudflare Inc.</td><td>DNS and network security</td><td>USA / Global</td></tr>
            <tr><td>Tailscale Inc.</td><td>Infrastructure networking (no user PII)</td><td>Canada</td></tr>
            <tr><td>Resend Inc.</td><td>Transactional email</td><td>USA</td></tr>
            <tr><td>Anthropic PBC</td><td>AI features (LLM processing)</td><td>USA</td></tr>
            <tr><td>OpenRouter Inc.</td><td>LLM gateway routing</td><td>USA</td></tr>
          </tbody>
        </table>
        <p>
          We do <strong>not sell</strong> your personal information to third parties.
          We do not share data with advertisers.
        </p>
      </section>

      <section>
        <h2>4. Data Retention</h2>
        <ul>
          <li><strong>Account data:</strong> retained for the duration of your subscription plus 36 months.</li>
          <li><strong>Billing records:</strong> 7 years (US tax law requirements).</li>
          <li><strong>API access logs:</strong> 90 days rolling.</li>
          <li><strong>Audit logs:</strong> 5 years.</li>
          <li>
            <strong>Tenant offboarding:</strong> upon account termination, tenant data is
            deleted or anonymized within 30 days, unless retention is required by law.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Security</h2>
        <p>
          Opsly employs industry-standard security controls: AES-256 encryption at rest,
          TLS 1.2+ in transit, role-based access control (RBAC), multi-factor authentication
          for admin access, audit logging, and automated secret rotation. See our{' '}
          <a href="/legal/security">Security page</a> for the full trust posture.
        </p>
        <p>
          In the event of a security breach affecting your data, we will notify affected
          customers within <strong>72 hours</strong> of becoming aware, per industry best
          practice and applicable law.
        </p>
      </section>

      <section>
        <h2>6. California Residents — CCPA Rights</h2>
        <p>
          If you are a California resident, you have additional rights under the California
          Consumer Privacy Act (CCPA) and its amendment (CPRA):
        </p>
        <ul>
          <li><strong>Right to Know:</strong> request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
          <li><strong>Right to Delete:</strong> request deletion of your personal information, subject to certain exceptions.</li>
          <li><strong>Right to Correct:</strong> request correction of inaccurate personal information.</li>
          <li><strong>Right to Opt-Out of Sale/Sharing:</strong> we do not sell or share personal information for cross-context behavioral advertising.</li>
          <li><strong>Right to Non-Discrimination:</strong> we will not discriminate against you for exercising your CCPA rights.</li>
        </ul>
        <p>
          To exercise these rights, email{' '}
          <a href="mailto:privacy@opsly.io">privacy@opsly.io</a>. We will respond within
          45 days (extendable by 45 additional days with notice).
        </p>
      </section>

      <section>
        <h2>7. Your Rights (General)</h2>
        <p>Regardless of location, you may contact us to:</p>
        <ul>
          <li>Access, correct, or update your personal information.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt out of marketing communications (unsubscribe link in every email).</li>
          <li>Obtain a copy of your data in a portable format.</li>
        </ul>
        <p>
          Contact: <a href="mailto:privacy@opsly.io">privacy@opsly.io</a>
        </p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>
          The Opsly platform is not directed to individuals under 18. We do not knowingly
          collect personal information from minors. If you believe we have inadvertently
          collected such information, contact us immediately at{' '}
          <a href="mailto:privacy@opsly.io">privacy@opsly.io</a>.
        </p>
      </section>

      <section>
        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this policy. Material changes will be communicated via email to
          account administrators at least <strong>30 days</strong> before taking effect.
          Continued use of the service after the effective date constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Opsly · privacy@opsly.io<br />
          Governing law: State of Delaware, United States
        </p>
      </section>
    </OpslyLegalPageLayout>
  )
}
