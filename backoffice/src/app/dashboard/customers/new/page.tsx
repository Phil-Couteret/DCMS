import Link from "next/link";
import { CustomerForm } from "@/components/customers/customer-form";
import { centerNow } from "@/lib/center-time";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link href="/dashboard/customers" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All customers
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">New customer</h1>
      <CustomerForm
        initial={{
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          country: "",
          language: "EN",
          birthdate: "",
          certificationAgency: "",
          certificationLevel: "",
          emergencyName: "",
          emergencyPhone: "",
          emergencyRelationship: "",
        }}
        cancelHref="/dashboard/customers"
        maxBirthdate={centerNow().isoDate}
      />
    </main>
  );
}
