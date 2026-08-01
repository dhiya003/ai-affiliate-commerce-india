import Link from "next/link";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f2] px-5 py-12 text-[#14211a] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-[#dfe3dc] bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#2d7d46]">
          ← Affinity India
        </Link>
        <h1 className="mt-7 text-4xl font-semibold tracking-tight">
          Terms of use
        </h1>
        <p className="mt-2 text-sm text-[#69746c]">
          Last updated: 2 August 2026
        </p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-[#4f5d54]">
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">Purpose</h2>
            <p className="mt-2">
              Affinity India is a decision-support and content-operations tool
              for affiliate commerce. Scores, trends, commission estimates, AI
              output, and recommendations are informational and do not guarantee
              sales, earnings, availability, price, or marketplace approval.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Your responsibilities
            </h2>
            <p className="mt-2">
              You must verify product facts, prices, stock, affiliate
              eligibility, disclosures, destination links, intellectual-property
              rights, and the latest marketplace terms before publishing. Human
              approval remains required even when an automated compliance check
              passes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Permitted use
            </h2>
            <p className="mt-2">
              Do not misuse the service, evade access controls, upload unlawful
              or misleading material, automate prohibited marketplace access,
              manipulate attribution, generate deceptive claims, or interfere
              with other users or infrastructure.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Affiliate disclosure
            </h2>
            <p className="mt-2">
              Some links created or stored through the platform may be affiliate
              links. Publishers are responsible for clear, conspicuous
              disclosures wherever required and for complying with applicable
              advertising and consumer-protection rules.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Availability and changes
            </h2>
            <p className="mt-2">
              Marketplace sources and external providers may change, fail,
              rate-limit, or revoke access. Features may be paused to protect
              data quality, security, compliance, or service reliability.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">Liability</h2>
            <p className="mt-2">
              To the extent permitted by applicable law, the service is provided
              without warranties and the workspace owner is not responsible for
              indirect losses, marketplace enforcement, lost commissions, or
              decisions made without independent verification.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
