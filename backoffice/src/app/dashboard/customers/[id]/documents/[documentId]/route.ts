import { fetchCustomerDocumentFile } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A customer document's file, streamed from the API with the staff
// member's session (the proxy has already required one). Shown in the
// browser, or saved with ?download=1. Only PDFs and photos are stored (the
// API checks the contents), and the browser is told not to guess the type.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  if (!UUID.test(id) || !UUID.test(documentId)) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const upstream = await fetchCustomerDocumentFile(id, documentId, download);
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 403 || upstream.status === 404 ? upstream.status : 502;
    return new Response(status === 404 ? "This document no longer exists" : "The document could not be loaded", {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
