import type { Metadata } from 'next'
import { OpslyLegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Terms of Service · Opsly',
}

export default function TermsPage(): React.ReactElement {
  return (
    <OpslyLegalPageLayout
      title="Terms of Service"
      version="1.0"
      effectiveDate="May 24, 2026"
    >
      <p>
        These Terms of Service ("Agreement") govern your access to and use of the Opsly
        platform and services provided by Opsly ("Company", "we", "us"). By accessing or
        using Opsly, you agree to be bound by this Agreement. If you do not agree, do not
        use the service.
      </p>

      <section>
        <h2>1. Service Description</h2>
        <p>
          Opsly is a multi-tenant SaaS platform that provides AI agent orchestration,
          workflow automation (n8n), monitoring, LLM gateway services, and related tools
          for businesses. Features and availability may vary by subscription tier.
        </p>
      </section>

      <section>
        <h2>2. Account Registration and Security</h2>
        <ul>
          <li>You must provide accurate and complete registration information.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>
            You must maintain the security of your credentials and notify us immediately
            at <a href="mailto:security@opsly.io">security@opsly.io</a> of any unauthorized access.
          </li>
          <li>Accounts may not be shared across organizations without a separate agreement.</li>
        </ul>
      </section>

      <section>
        <h2>3. Acceptable Use</h2>
        <p>
          Your use of Opsly is subject to our{' '}
          <a href="/legal/aup">Acceptable Use Policy</a>, incorporated herein by reference.
          Violations may result in immediate suspension or termination of your account.
        </p>
      </section>

      <section>
        <h2>4. Subscriptions and Billing</h2>
        <ul>
          <li>
            Subscriptions are billed in advance on a monthly or annual basis, as selected
            at checkout.
          </li>
          <li>
            Usage-based charges (API calls, compute, storage) are billed in arrears at the
            end of each billing period.
          </li>
          <li>All fees are in US Dollars and are non-refundable unless otherwise stated.</li>
          <li>
            We will provide at least <strong>30 days written notice</strong> before any
            price increases.
          </li>
          <li>
            Failure to pay may result in service suspension after a 10-day grace period
            following a past-due notice.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Data Ownership and Processing</h2>
        <ul>
          <li>You retain all ownership rights to the data you store in Opsly.</li>
          <li>
            You grant Opsly a limited license to process your data solely to provide the
            service. We do not use your data to train AI models without your explicit consent.
          </li>
          <li>
            For customers who process personal data of third parties through Opsly, you are
            the data controller. Contact us to execute a Data Processing Addendum (DPA) at{' '}
            <a href="mailto:legal@opsly.io">legal@opsly.io</a>.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <ul>
          <li>
            Opsly and its underlying technology, trademarks, and content are owned by Opsly.
            No license is granted to copy, modify, or distribute them.
          </li>
          <li>
            You retain all intellectual property rights in content you create using the
            platform (workflows, agents, configurations, output).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Service Levels and Availability</h2>
        <p>
          We target 99.9% monthly uptime for production services. Scheduled maintenance
          windows will be announced at least 48 hours in advance. For service credit terms,
          see our SLA document at{' '}
          <a href="/legal/sla">opsly.io/legal/sla</a> (coming soon).
        </p>
      </section>

      <section>
        <h2>8. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." OPSLY DISCLAIMS ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL OPSLY'S TOTAL
          LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU IN THE
          12 MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED US DOLLARS ($100).
          OPSLY WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES.
        </p>
      </section>

      <section>
        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Opsly and its officers,
          directors, employees, and agents from any claims, liabilities, damages, losses,
          and expenses (including reasonable legal fees) arising from your use of the
          service, your violation of this Agreement, or your violation of any third-party
          rights.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <ul>
          <li>You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.</li>
          <li>We may suspend or terminate your account for violations of this Agreement, with or without notice.</li>
          <li>Upon termination, you will have 30 days to export your data before it is deleted.</li>
        </ul>
      </section>

      <section>
        <h2>12. Governing Law and Dispute Resolution</h2>
        <p>
          This Agreement is governed by the laws of the <strong>State of Delaware</strong>,
          without regard to conflict of law principles. Any dispute arising from this
          Agreement will be resolved by binding arbitration administered by JAMS under its
          Streamlined Arbitration Rules, except either party may seek injunctive relief in
          a court of competent jurisdiction. The arbitration will be conducted in English.
        </p>
      </section>

      <section>
        <h2>13. Modifications</h2>
        <p>
          We may modify this Agreement at any time with at least <strong>30 days notice</strong>.
          Your continued use after the effective date constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          <a href="mailto:legal@opsly.io">legal@opsly.io</a>
        </p>
      </section>
    </OpslyLegalPageLayout>
  )
}
