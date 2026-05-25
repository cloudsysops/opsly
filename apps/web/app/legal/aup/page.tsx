import type { Metadata } from 'next'
import { OpslyLegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy · Opsly',
}

export default function AupPage(): React.ReactElement {
  return (
    <OpslyLegalPageLayout
      title="Acceptable Use Policy"
      version="1.0"
      effectiveDate="May 24, 2026"
    >
      <p>
        This Acceptable Use Policy ("AUP") governs how you may use the Opsly platform.
        Violation of this policy may result in immediate suspension or termination of your
        account without refund.
      </p>

      <section>
        <h2>1. Prohibited Activities</h2>
        <p>You may not use Opsly to:</p>

        <h3>Illegal or Harmful Content</h3>
        <ul>
          <li>Store, transmit, or process content that violates applicable law (federal, state, or local).</li>
          <li>Infringe any patent, trademark, copyright, trade secret, or other intellectual property right.</li>
          <li>Collect or process personally identifiable information without appropriate legal basis (consent, contract, or legitimate interest).</li>
          <li>Generate, distribute, or store child sexual abuse material (CSAM) or any content that sexualizes minors.</li>
          <li>Engage in any form of identity theft or impersonation.</li>
        </ul>

        <h3>Security and Infrastructure Abuse</h3>
        <ul>
          <li>Attempt to probe, scan, or test the vulnerability of the Opsly infrastructure or any third-party system.</li>
          <li>Attempt to bypass, disable, or circumvent any security, authentication, or access control mechanism.</li>
          <li>Launch or facilitate denial-of-service (DoS/DDoS) attacks against any target.</li>
          <li>Upload, transmit, or execute malware, viruses, ransomware, or any destructive code.</li>
          <li>Attempt to access another tenant's data or resources.</li>
          <li>Use Opsly to conduct unauthorized penetration tests against third-party systems without their explicit written permission.</li>
        </ul>

        <h3>Platform Abuse</h3>
        <ul>
          <li>Reverse engineer, decompile, or disassemble any part of the Opsly platform.</li>
          <li>Resell or sublicense Opsly services without an authorized reseller agreement.</li>
          <li>Use automated means to scrape or extract data from Opsly dashboards or APIs in excess of documented rate limits.</li>
          <li>Generate excessive API load that degrades service quality for other tenants.</li>
          <li>Use the platform to send unsolicited bulk email (spam) or engage in CAN-SPAM violations.</li>
        </ul>

        <h3>AI-Specific Restrictions</h3>
        <ul>
          <li>Use LLM features to generate disinformation, deepfakes, or deceptive content at scale.</li>
          <li>Attempt to extract training data, model weights, or system prompts from Opsly's AI services.</li>
          <li>Use AI features to target or harm specific individuals.</li>
          <li>Deploy autonomous AI agents in ways that cause financial harm, privacy violations, or safety risks to third parties.</li>
        </ul>
      </section>

      <section>
        <h2>2. Resource Limits</h2>
        <p>
          Each subscription tier includes defined resource limits (API calls, storage,
          compute). Sustained usage above plan limits may result in throttling, overage
          charges, or a required plan upgrade. We will notify you before taking action.
        </p>
      </section>

      <section>
        <h2>3. Security Vulnerability Disclosure</h2>
        <p>
          If you discover a security vulnerability in the Opsly platform, please report it
          responsibly to{' '}
          <a href="mailto:security@opsly.io">security@opsly.io</a>. Do not exploit the
          vulnerability or disclose it publicly before we have had a reasonable opportunity
          to address it. We operate a responsible disclosure program and will acknowledge
          valid reports.
        </p>
      </section>

      <section>
        <h2>4. Enforcement</h2>
        <p>
          Opsly reserves the right to investigate suspected violations. We may:
        </p>
        <ul>
          <li>Suspend or terminate the offending account immediately upon detection of serious violations.</li>
          <li>Report illegal activity to law enforcement agencies.</li>
          <li>Cooperate with law enforcement investigations, including providing data under lawful process.</li>
          <li>Seek injunctive relief or damages in a court of competent jurisdiction.</li>
        </ul>
        <p>
          For suspected violations or to report abuse: <a href="mailto:abuse@opsly.io">abuse@opsly.io</a>
        </p>
      </section>

      <section>
        <h2>5. Changes</h2>
        <p>
          We may update this AUP with 30 days notice. Continued use constitutes acceptance.
          Governing law: State of Delaware, United States.
        </p>
      </section>
    </OpslyLegalPageLayout>
  )
}
