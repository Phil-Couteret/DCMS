"use client";

import Link from "next/link";
import { useState } from "react";
import { CancelInvoiceButton } from "@/components/billing/invoice-buttons";
import { InvoiceStatusBadge } from "@/components/billing/invoice-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InvoiceListItem } from "@/lib/api";
import { CANCELLABLE, eur, formatDay } from "@/lib/billing";

// Customer search runs in the browser over the invoices already loaded.
export function InvoicesTable({ invoices, filtered }: { invoices: InvoiceListItem[]; filtered: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q
    ? invoices.filter((i) => `${i.customer.firstName} ${i.customer.lastName}`.toLowerCase().includes(q))
    : invoices;

  return (
    <div className="space-y-4">
      <label className="block max-w-sm text-sm font-medium text-zinc-700">
        Search by customer
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Ana Diaz"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No invoices found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {q || filtered ? "No invoice matches this search or filter." : "No invoices have been created yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.invoiceNumber}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDay(i.createdAt)}</TableCell>
                  <TableCell>
                    {i.customer.firstName} {i.customer.lastName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{eur(i.total, i.currency)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-2">
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/billing/${i.id}`} prefetch={false} />}>
                        View
                      </Button>
                      {CANCELLABLE.includes(i.status) && <CancelInvoiceButton invoiceId={i.id} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-zinc-500">
        {rows.length} of {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
