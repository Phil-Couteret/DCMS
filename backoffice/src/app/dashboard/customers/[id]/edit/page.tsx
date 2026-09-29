import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { ApiError, getCustomer } from "@/lib/api";
import { centerNow } from "@/lib/center-time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only string values of the free-form emergency contact are edited here.
function field(contact: unknown, key: string) {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) return "";
  const value = (contact as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const profileHref = `/dashboard/customers/${id}`;

  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link href={profileHref} prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Back to profile
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Edit {customer.firstName} {customer.lastName}
      </h1>
      <CustomerForm
        customerId={id}
        initial={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone ?? "",
          country: customer.country,
          language: customer.language,
          birthdate: customer.birthdate?.slice(0, 10) ?? "",
          gender: customer.gender ?? "",
          customerType: customer.customerType,
          centerSkillLevel: customer.centerSkillLevel ?? "",
          isApproved: customer.isApproved,
          totalDives: String(customer.totalDives),
          loyaltyPoints: String(customer.loyaltyPoints),
          notes: customer.notes ?? "",
          medicalCertNumber: customer.medicalCertNumber ?? "",
          medicalCertExpiry: customer.medicalCertExpiry?.slice(0, 10) ?? "",
          insuranceProvider: customer.insuranceProvider ?? "",
          insurancePolicyNumber: customer.insurancePolicyNumber ?? "",
          insuranceExpiry: customer.insuranceExpiry?.slice(0, 10) ?? "",
          ownEquipment: customer.ownEquipment,
          tankSize: customer.tankSize ?? "",
          bcdSize: customer.bcdSize ?? "",
          wetsuitSize: customer.wetsuitSize ?? "",
          finsSize: customer.finsSize ?? "",
          bootsSize: customer.bootsSize ?? "",
          emergencyName: field(customer.emergencyContact, "name"),
          emergencyPhone: field(customer.emergencyContact, "phone"),
          emergencyRelationship: field(customer.emergencyContact, "relationship"),
        }}
        cancelHref={profileHref}
        maxBirthdate={centerNow().isoDate}
      />
    </main>
  );
}
