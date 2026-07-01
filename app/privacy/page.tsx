import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — AdvisorAI",
  description: "Privacy Policy for AdvisorAI SaaS subscription.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 31, 2026">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">1. Introduction</h2>
        <p className="mt-3 text-sm leading-relaxed">
          AdvisorAI (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is
          operated by Rustem Yertisbay and provided at{" "}
          <a
            href="https://advisorai.help"
            className="text-gray-900 underline hover:no-underline"
          >
            advisorai.help
          </a>
          . This Privacy Policy explains how we collect, use, disclose, and
          protect personal information when you use our software-as-a-service
          platform for automotive service advisors, including paid subscription
          plans (Starter, Standard, and Professional).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          2. Information we collect
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          We may collect the following categories of information:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong className="font-medium text-gray-900">Account data:</strong>{" "}
            name, email address, password (stored hashed), dealership or employer
            name, and billing country
          </li>
          <li>
            <strong className="font-medium text-gray-900">Payment data:</strong>{" "}
            processed by our payment provider (e.g. Stripe); we do not store full
            card numbers
          </li>
          <li>
            <strong className="font-medium text-gray-900">Usage data:</strong>{" "}
            pages visited, features used, estimate counts, IP address, browser
            type, device type, and timestamps
          </li>
          <li>
            <strong className="font-medium text-gray-900">Content you submit:</strong>{" "}
            repair job descriptions, vehicle details, mileage, and AI-generated
            outputs (estimates, explanations, upsell suggestions)
          </li>
          <li>
            <strong className="font-medium text-gray-900">Communications:</strong>{" "}
            support requests, feedback, and marketing preferences
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          3. How we use your information
        </h2>
        <p className="mt-3 text-sm leading-relaxed">We use personal information to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Provide, operate, and maintain the Service</li>
          <li>Process subscriptions and payments for paid plans</li>
          <li>Generate AI outputs from job descriptions you submit</li>
          <li>Enforce usage limits on free and paid plans</li>
          <li>Send service-related notices (billing, security, product updates)</li>
          <li>Improve the Service through aggregated analytics</li>
          <li>Comply with legal obligations and prevent fraud or abuse</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed">
          We do not sell your personal information to third parties.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          4. AI processing and job descriptions
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          Job descriptions you enter are sent to third-party AI providers to
          generate responses. As stated on our marketing site, job descriptions
          are processed to produce your output and are not stored permanently by
          default. We may retain outputs briefly for delivery, abuse prevention,
          or debugging, then delete or anonymize them according to our retention
          schedule. Do not submit customer names, VINs, or other highly sensitive
          personal data unless necessary and permitted by your employer&apos;s
          policies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          5. Legal bases (UK, EU, UAE)
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          Where applicable under UK GDPR, EU GDPR, or similar laws, we process
          data based on: performance of a contract (providing the Service),
          legitimate interests (security, improvement, analytics), consent (where
          required for marketing), and legal obligation.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          6. Sharing with third parties
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          We may share information with:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Payment processors for subscription billing</li>
          <li>Cloud hosting and infrastructure providers</li>
          <li>AI model providers to process your job descriptions</li>
          <li>Analytics and email service providers</li>
          <li>Professional advisers or authorities when required by law</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed">
          All processors are bound by contracts requiring appropriate security
          and use limitations.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          7. International transfers
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          We serve users in the UAE, UK, US, and other regions. Your data may be
          processed in countries outside your residence. Where required, we use
          appropriate safeguards such as Standard Contractual Clauses or equivalent
          mechanisms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">8. Retention</h2>
        <p className="mt-3 text-sm leading-relaxed">
          We retain account and billing records for as long as your subscription
          is active and for a reasonable period afterward for legal and accounting
          purposes. Job descriptions and generated outputs on the free plan are
          processed with minimal retention; Pro plan estimate history is retained
          while your subscription is active and deleted within 30 days of account
          closure unless law requires longer retention.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">9. Security</h2>
        <p className="mt-3 text-sm leading-relaxed">
          We implement technical and organizational measures including encryption
          in transit (HTTPS), access controls, and secure credential storage.
          No method of transmission over the Internet is 100% secure; we cannot
          guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">10. Your rights</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Depending on your location, you may have the right to access, correct,
          delete, restrict, or port your personal data, and to object to certain
          processing. You may withdraw consent for marketing at any time. UK and
          EU residents may lodge a complaint with their supervisory authority.
          To exercise rights, contact us at the email below.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">11. Cookies</h2>
        <p className="mt-3 text-sm leading-relaxed">
          We use essential cookies for authentication and session management. We
          may use analytics cookies to understand how the Service is used. You
          can control non-essential cookies through your browser settings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">12. Children</h2>
        <p className="mt-3 text-sm leading-relaxed">
          The Service is not directed to individuals under 18. We do not knowingly
          collect personal information from children.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          13. Changes to this policy
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          We may update this Privacy Policy from time to time. We will post the
          revised version on advisorai.help and update the &ldquo;Last
          updated&rdquo; date. Material changes will be notified via email or
          in-app notice where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">14. Contact</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Data controller: Rustem Yertisbay, operating AdvisorAI
          <br />
          Email:{" "}
          <a
            href="mailto:privacy@advisorai.help"
            className="text-gray-900 underline hover:no-underline"
          >
            privacy@advisorai.help
          </a>
          <br />
          Website:{" "}
          <a
            href="https://advisorai.help"
            className="text-gray-900 underline hover:no-underline"
          >
            advisorai.help
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
