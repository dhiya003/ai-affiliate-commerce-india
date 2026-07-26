import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f5f1] p-6 text-[#19231d]">
      <section className="w-full max-w-md rounded-3xl border border-[#dce2db] bg-white p-8 text-center shadow-[0_24px_70px_rgba(36,57,43,0.1)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fbe8e3] text-[#b94b37]">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
          You don’t have access
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6d786f]">
          This area requires a different Affinity India role. Ask an
          administrator if you believe this is a mistake.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex rounded-full bg-[#173f2a] px-5 py-3 text-sm font-semibold text-white"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
