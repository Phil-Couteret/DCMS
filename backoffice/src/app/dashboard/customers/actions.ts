"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, createCustomer, getCustomer, updateCustomer, type Language } from "@/lib/api";
import { CERT_AGENCIES, CERT_LABELS, LANGUAGES } from "@/lib/customers";

export type CustomerFormState = { error?: string } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// Creates or updates a customer, then opens their profile.
export async function saveCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const id = text(formData, "customerId");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const email = text(formData, "email");
  const country = text(formData, "country").toUpperCase();
  const language = text(formData, "language") as Language;
  const birthdate = text(formData, "birthdate");
  const level = text(formData, "certificationLevel");
  const agency = text(formData, "certificationAgency");

  if (!firstName || !lastName) return { error: "Enter a first and last name" };
  if (!email) return { error: "Enter an email address" };
  if (!country) return { error: "Enter a country" };
  if (!LANGUAGES.some((l) => l.code === language)) return { error: "Choose a language" };
  if (birthdate && !ISO_DATE.test(birthdate)) return { error: "Enter a valid birthdate" };
  if (level && !(level in CERT_LABELS)) return { error: "Choose a certification level" };
  const certified = level !== "" && level !== "none";
  if (certified && !CERT_AGENCIES.includes(agency)) return { error: "Choose the certifying agency" };

  // Keys other than name, phone and relationship are kept as they are.
  let emergencyContact: Record<string, unknown> = {};
  if (id) {
    try {
      const current = (await getCustomer(id)).emergencyContact;
      if (current && typeof current === "object" && !Array.isArray(current)) {
        emergencyContact = { ...(current as Record<string, unknown>) };
      }
    } catch (e) {
      return { error: e instanceof ApiError ? e.message : "The customer could not be loaded" };
    }
  }
  for (const key of ["name", "phone", "relationship"]) {
    const value = text(formData, `emergency_${key}`);
    if (value) emergencyContact[key] = value;
    else delete emergencyContact[key];
  }

  const data = {
    firstName,
    lastName,
    email,
    phone: text(formData, "phone") || null,
    country,
    language,
    birthdate: birthdate || null,
    certificationLevel: level || null,
    certificationAgency: certified ? agency : null,
    emergencyContact: Object.keys(emergencyContact).length > 0 ? emergencyContact : null,
  };

  let savedId: string;
  try {
    savedId = (id ? await updateCustomer(id, data) : await createCustomer(data)).id;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "The customer could not be saved" };
  }
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${savedId}`);
  redirect(`/dashboard/customers/${savedId}`);
}
