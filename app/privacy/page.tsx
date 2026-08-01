import Link from "next/link";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f2] px-5 py-12 text-[#14211a] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-[#dfe3dc] bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#2d7d46]">
          ← Affinity India
        </Link>
        <h1 className="mt-7 text-4xl font-semibold tracking-tight">
          Privacy policy
        </h1>
        <p className="mt-2 text-sm text-[#69746c]">
          Last updated: 2 August 2026
        </p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-[#4f5d54]">
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              What we process
            </h2>
            <p className="mt-2">
              We process the identity supplied through Sign in with ChatGPT,
              products and campaign information you submit, generated content,
              marketplace evidence, notification preferences, and affiliate
              performance events. Tracking records use one-way daily
              fingerprints; raw external order identifiers and raw IP addresses
              are not stored by the application.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Why we process it
            </h2>
            <p className="mt-2">
              Information is used to rank products, generate and check affiliate
              content, attribute clicks and conversions, calculate performance,
              operate alerts, secure the service, and maintain administrator
              audit evidence.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Sharing and providers
            </h2>
            <p className="mt-2">
              Data is shared only with configured infrastructure, AI,
              marketplace, monitoring, and notification providers needed to
              deliver the service. Affiliate destinations receive ordinary
              browser requests when you open or share their links. We do not
              sell personal information.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Retention and security
            </h2>
            <p className="mt-2">
              Administrator-controlled retention periods apply by evidence
              category. The platform uses access controls, owner-scoped queries,
              encryption in transit, restrictive browser headers, request
              throttling, privacy-safe identifiers, audit logs, and incident
              procedures. No online system can guarantee absolute security.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">
              Your choices
            </h2>
            <p className="mt-2">
              You may disable notification categories, request correction or
              deletion of account-associated records, and stop using the
              service. Marketplace and affiliate networks may independently
              process activity under their own policies.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#14211a]">Contact</h2>
            <p className="mt-2">
              For a privacy or data request, contact the workspace owner through
              the account that granted access to this private application.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
