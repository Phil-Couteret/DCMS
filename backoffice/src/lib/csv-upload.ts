// The CSV file from an import form, for the API: a FormData with "file".
// Checked here so an obviously wrong file gets a plain message.
export const MAX_CSV_BYTES = 2_000_000;

export function csvUpload(formData: FormData): { form: FormData } | { error: string } {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > MAX_CSV_BYTES) return { error: "The file is over 2 MB; split it into smaller files" };
  if (!/\.(csv|txt)$/i.test(file.name)) return { error: "Choose a .csv file (in a spreadsheet: Save as → CSV)" };
  const form = new FormData();
  form.set("file", file, file.name);
  return { form };
}
