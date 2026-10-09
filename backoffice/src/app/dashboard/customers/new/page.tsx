import Link from "next/link";
import { CustomerForm } from "@/components/customers/customer-form";
import { centerLocale } from "@/lib/center";
import { centerNow } from "@/lib/center-time";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const { timeZone } = await centerLocale();
  const t = await getT();
  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link href="/dashboard/customers" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All customers")}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("New customer")}</h1>
      <CustomerForm
        initial={{
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          country: "",
          language: "EN",
          birthdate: "",
          gender: "",
          customerType: "TOURIST",
          centerSkillLevel: "",
          isApproved: true,
          totalDives: "0",
          loyaltyPoints: "0",
          notes: "",
          medicalCertNumber: "",
          medicalCertExpiry: "",
          insuranceProvider: "",
          insurancePolicyNumber: "",
          insuranceExpiry: "",
          ownEquipment: false,
          tankSize: "",
          bcdSize: "",
          wetsuitSize: "",
          finsSize: "",
          bootsSize: "",
          emergencyName: "",
          emergencyPhone: "",
          emergencyRelationship: "",
        }}
        cancelHref="/dashboard/customers"
        maxBirthdate={centerNow(timeZone).isoDate}
      />
    </main>
  );
}
