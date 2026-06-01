import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy — AdvisorAI",
  description: "7-day money-back guarantee for AdvisorAI Pro subscriptions.",
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="June 1, 2026">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          7-day money-back guarantee
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          We want you to be confident in AdvisorAI. If you subscribe to a paid
          plan (including Pro at $29/month) and are not satisfied for any reason,
          contact us within <strong className="font-medium text-gray-900">7 days</strong> of
          your first paid charge and we will refund that payment in full. No
          questions asked.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Who is eligible</h2>
        <p className="mt-3 text-sm leading-relaxed">
          The guarantee applies to your first subscription payment on a paid plan
          after signing up. It does not apply to:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Renewal charges after the initial 7-day period</li>
          <li>Team or custom enterprise plans unless agreed in writing</li>
          <li>Accounts terminated for violation of our Terms of Service</li>
          <li>Chargebacks filed before contacting us to request a refund</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">How to request a refund</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Email{" "}
          <a
            href="mailto:support@advisorai.help"
            className="text-gray-900 underline hover:no-underline"
          >
            support@advisorai.help
          </a>{" "}
          from the address linked to your account with the subject line
          &ldquo;Refund request.&rdquo; Include your account email and the date
          of your charge. We do not require a reason, but you may share feedback
          if you wish — it helps us improve.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Processing time</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Approved refunds are issued to your original payment method within{" "}
          <strong className="font-medium text-gray-900">5–10 business days</strong>.
          Your bank or card issuer may take additional time to post the credit.
          Your subscription will be cancelled immediately when a refund is
          approved.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Free plan</h2>
        <p className="mt-3 text-sm leading-relaxed">
          The free plan does not involve payment and is not subject to this
          refund policy. You may stop using the free plan at any time without
          contacting us.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Cancellations after 7 days
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          You may cancel a paid subscription at any time from your account
          settings. Cancellations stop future billing at the end of the current
          billing period. Charges outside the 7-day guarantee window are
          non-refundable except where required by applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed">
          AdvisorAI · Rustem Yertisbay
          <br />
          <a
            href="mailto:support@advisorai.help"
            className="text-gray-900 underline hover:no-underline"
          >
            support@advisorai.help
          </a>
          <br />
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
