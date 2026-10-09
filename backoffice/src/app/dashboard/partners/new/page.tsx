import Link from "next/link";
import { PartnerForm } from "@/components/partners/partner-forms";
import { getT } from "@/lib/i18n/server";

export default async function NewPartnerPage() {
  const t = await getT();
  return (
    <main className="max-w-3xl space-y-6 p-6 md:p-8">
      <Link href="/dashboard/partners" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All partners")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Add partner")}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("An API key and secret are created with the partner. The secret is their portal password and is shown once.")}
        </p>
      </div>
      <PartnerForm />
    </main>
  );
}
