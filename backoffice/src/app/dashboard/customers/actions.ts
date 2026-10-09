"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  createCustomer,
  createCustomerCertification,
  deleteCustomerCertification,
  deleteCustomerDocument,
  importCustomers,
  uploadCustomerDocument,
  type CustomerDocumentType,
  type ImportResult,
  getCustomer,
  updateCustomer,
  updateCustomerCertification,
  type CustomerData,
  type CustomerType,
  type Language,
  type SkillLevel,
} from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import {
  CERT_AGENCIES,
  CERT_LABELS,
  CUSTOMER_TYPE_LABELS,
  GEAR_SIZES,
  GENDER_LABELS,
  LANGUAGES,
  RENTAL_SIZE_FIELDS,
  SKILL_LEVEL_LABELS,
  TANK_SIZES,
} from "@/lib/customers";
import { csvUpload } from "@/lib/csv-upload";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents";

export type CustomerFormState = { error?: string } | null;
export type CustomerActionState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// A whole number of at least 0, or null when the field is not one.
function count(formData: FormData, name: string) {
  const raw = text(formData, name);
  const n = raw === "" ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function fail(e: unknown, fallback: string) {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function refresh(customerId: string) {
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
}

// A size from the offered list, or the value the customer already had.
function size(formData: FormData, name: string, options: string[]) {
  const value = text(formData, name);
  if (value === "") return { value: null };
  if (options.includes(value) || value === text(formData, `${name}_initial`)) return { value };
  return { error: "Choose a size from the list" };
}

// Creates or updates a customer, then opens their profile.
export async function saveCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const email = text(formData, "email");
  const country = text(formData, "country").toUpperCase();
  const language = text(formData, "language") as Language;
  const birthdate = text(formData, "birthdate");
  const gender = text(formData, "gender");
  const customerType = text(formData, "customerType") as CustomerType;
  const skill = text(formData, "centerSkillLevel");
  const totalDives = count(formData, "totalDives");
  const loyaltyPoints = count(formData, "loyaltyPoints");
  const medicalCertExpiry = text(formData, "medicalCertExpiry");
  const insuranceExpiry = text(formData, "insuranceExpiry");
  const waiverSignedAt = text(formData, "waiverSignedAt");
  const ownEquipment = formData.get("ownEquipment") === "on";

  if (!firstName || !lastName) return { error: t("Enter a first and last name") };
  if (!email) return { error: t("Enter an email address") };
  if (!country) return { error: t("Enter a country") };
  if (!LANGUAGES.some((l) => l.code === language)) return { error: t("Choose a language") };
  if (birthdate && !ISO_DATE.test(birthdate)) return { error: t("Enter a valid birthdate") };
  if (gender && !(gender in GENDER_LABELS) && gender !== text(formData, "gender_initial")) {
    return { error: t("Choose a gender") };
  }
  if (!(customerType in CUSTOMER_TYPE_LABELS)) return { error: t("Choose a customer type") };
  if (skill && !(skill in SKILL_LEVEL_LABELS)) return { error: t("Choose a skill level") };
  if (totalDives === null) return { error: t("Dives logged must be a whole number, 0 or more") };
  if (loyaltyPoints === null) return { error: t("Loyalty points must be a whole number, 0 or more") };
  if (medicalCertExpiry && !ISO_DATE.test(medicalCertExpiry)) return { error: t("Enter a valid medical certificate expiry") };
  if (insuranceExpiry && !ISO_DATE.test(insuranceExpiry)) return { error: t("Enter a valid insurance expiry") };
  if (waiverSignedAt && !ISO_DATE.test(waiverSignedAt)) return { error: t("Enter a valid waiver date") };

  // With their own equipment, the rental size fields are disabled and not
  // sent: the sizes on record are kept.
  const tank = size(formData, "tankSize", TANK_SIZES);
  if (tank.error) return { error: t(tank.error) };
  const sizes: Partial<CustomerData> = {};
  if (!ownEquipment) {
    for (const f of RENTAL_SIZE_FIELDS) {
      const s = size(formData, f.key, GEAR_SIZES);
      if (s.error) return { error: t("{item}: choose a size from the list", { item: t(f.label) }) };
      sizes[f.key] = s.value;
    }
  }

  // Keys other than name, phone and relationship are kept as they are.
  let emergencyContact: Record<string, unknown> = {};
  if (id) {
    try {
      const current = (await getCustomer(id)).emergencyContact;
      if (current && typeof current === "object" && !Array.isArray(current)) {
        emergencyContact = { ...(current as Record<string, unknown>) };
      }
    } catch (e) {
      return fail(e, t("The customer could not be loaded"));
    }
  }
  for (const key of ["name", "phone", "relationship"]) {
    const value = text(formData, `emergency_${key}`);
    if (value) emergencyContact[key] = value;
    else delete emergencyContact[key];
  }

  const data: CustomerData = {
    firstName,
    lastName,
    email,
    phone: text(formData, "phone") || null,
    country,
    language,
    birthdate: birthdate || null,
    gender: gender || null,
    notes: text(formData, "notes") || null,
    totalDives,
    loyaltyPoints,
    customerType,
    centerSkillLevel: (skill || null) as SkillLevel | null,
    isApproved: formData.get("isApproved") === "on",
    medicalCertNumber: text(formData, "medicalCertNumber") || null,
    medicalCertExpiry: medicalCertExpiry || null,
    insuranceProvider: text(formData, "insuranceProvider") || null,
    insurancePolicyNumber: text(formData, "insurancePolicyNumber") || null,
    insuranceExpiry: insuranceExpiry || null,
    waiverSignedAt: waiverSignedAt || null,
    ownEquipment,
    tankSize: tank.value,
    ...sizes,
    emergencyContact: Object.keys(emergencyContact).length > 0 ? emergencyContact : null,
  };

  let savedId: string;
  try {
    savedId = (id ? await updateCustomer(id, data) : await createCustomer(data)).id;
  } catch (e) {
    return fail(e, t("The customer could not be saved"));
  }
  refresh(savedId);
  redirect(`/dashboard/customers/${savedId}`);
}

// Approves or revokes online booking, from the list or the profile.
export async function setApproval(_prev: CustomerActionState, formData: FormData): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  if (!UUID.test(id)) return { error: t("Unknown customer") };
  try {
    await updateCustomer(id, { isApproved: text(formData, "approve") === "true" });
  } catch (e) {
    return fail(e, t("The approval could not be changed"));
  }
  refresh(id);
  return { ok: true };
}

// Marks the medical certificate or insurance as checked now, or clears that.
export async function setDocumentVerified(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const kind = text(formData, "kind");
  if (!UUID.test(id)) return { error: t("Unknown customer") };
  if (kind !== "medical" && kind !== "insurance") return { error: t("Unknown document") };
  const value = text(formData, "verified") === "true" ? new Date().toISOString() : null;
  try {
    await updateCustomer(id, kind === "medical" ? { medicalCertVerifiedAt: value } : { insuranceVerifiedAt: value });
  } catch (e) {
    return fail(e, t("The verification could not be saved"));
  }
  refresh(id);
  return { ok: true };
}

export async function addCertification(_prev: CustomerActionState, formData: FormData): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const agency = text(formData, "agency");
  const level = text(formData, "level");
  const issueDate = text(formData, "issueDate");
  const expiryDate = text(formData, "expiryDate");
  if (!UUID.test(id)) return { error: t("Unknown customer") };
  if (!CERT_AGENCIES.includes(agency)) return { error: t("Choose the agency") };
  if (!level || level === "none" || !(level in CERT_LABELS)) return { error: t("Choose the level") };
  if (issueDate && !ISO_DATE.test(issueDate)) return { error: t("Enter a valid issue date") };
  if (expiryDate && !ISO_DATE.test(expiryDate)) return { error: t("Enter a valid expiry date") };
  if (issueDate && expiryDate && expiryDate < issueDate) return { error: t("The expiry date is before the issue date") };
  try {
    await createCustomerCertification(id, {
      agency,
      level,
      cardNumber: text(formData, "cardNumber") || null,
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
    });
  } catch (e) {
    return fail(e, t("The certification could not be added"));
  }
  refresh(id);
  return { ok: true };
}

export async function setCertificationVerified(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const certId = text(formData, "certId");
  if (!UUID.test(id) || !UUID.test(certId)) return { error: t("Unknown certification") };
  try {
    await updateCustomerCertification(id, certId, { verified: text(formData, "verified") === "true" });
  } catch (e) {
    return fail(e, t("The verification could not be saved"));
  }
  refresh(id);
  return { ok: true };
}

export async function removeCertification(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const certId = text(formData, "certId");
  if (!UUID.test(id) || !UUID.test(certId)) return { error: t("Unknown certification") };
  try {
    await deleteCustomerCertification(id, certId);
  } catch (e) {
    return fail(e, t("The certification could not be removed"));
  }
  refresh(id);
  return { ok: true };
}

export type DocumentUploadState = { error?: string; uploaded?: number } | null;

// A document for the customer's record (PDF or photo, at most 10 MB). The
// API decides the file's type from its contents.
export async function uploadDocument(_prev: DocumentUploadState, formData: FormData): Promise<DocumentUploadState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const type = text(formData, "type") as CustomerDocumentType;
  const file = formData.get("file");
  if (!UUID.test(id)) return { error: t("Unknown customer") };
  if (!DOCUMENT_TYPES.includes(type)) return { error: t("Choose what the document is") };
  if (!(file instanceof File) || file.size === 0) return { error: t("Choose a file") };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: t("The file is over 10 MB") };
  const form = new FormData();
  form.set("type", type);
  form.set("file", file, file.name);
  try {
    await uploadCustomerDocument(id, form);
  } catch (e) {
    return fail(e, t("The document could not be uploaded"));
  }
  refresh(id);
  return { uploaded: Date.now() };
}

export async function removeDocument(_prev: CustomerActionState, formData: FormData): Promise<CustomerActionState> {
  const t = await getT();
  const id = text(formData, "customerId");
  const documentId = text(formData, "documentId");
  if (!UUID.test(id) || !UUID.test(documentId)) return { error: t("Unknown document") };
  try {
    await deleteCustomerDocument(id, documentId);
  } catch (e) {
    return fail(e, t("The document could not be deleted"));
  }
  refresh(id);
  return { ok: true };
}

export type CustomerImportState = { error?: string; result?: ImportResult } | null;

export async function importCustomersCsv(_prev: CustomerImportState, formData: FormData): Promise<CustomerImportState> {
  const t = await getT();
  const upload = csvUpload(formData);
  if ("error" in upload) return { error: t(upload.error) };
  try {
    const result = await importCustomers(upload.form);
    revalidatePath("/dashboard/customers");
    return { result };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("The file could not be imported") };
  }
}

