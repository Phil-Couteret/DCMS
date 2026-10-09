// Backoffice sections only admins may open. The sidebar leaves them out for
// other staff, and the proxy sends other staff back to the dashboard; the API
// refuses their requests as well.
export const ADMIN_ONLY_SECTIONS = ["/dashboard/financial", "/dashboard/partners", "/dashboard/breaches"];

export function adminOnlySection(path: string) {
  return ADMIN_ONLY_SECTIONS.some((s) => path === s || path.startsWith(`${s}/`));
}
