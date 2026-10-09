import type { CustomerDocumentType } from "@/lib/api";

// Customer documents: what they can be, and what the API accepts (PDFs and
// photos, at most 10 MB).
export const DOCUMENT_TYPES: CustomerDocumentType[] = ["MEDICAL_CERT", "INSURANCE", "CERTIFICATION", "OTHER"];

export const DOCUMENT_TYPE_LABELS: Record<CustomerDocumentType, string> = {
  MEDICAL_CERT: "Medical certificate",
  INSURANCE: "Insurance",
  CERTIFICATION: "Certification card",
  OTHER: "Other",
};

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
