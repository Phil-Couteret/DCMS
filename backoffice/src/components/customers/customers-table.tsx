"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Customer } from "@/lib/api";
import { countryLabel, LANGUAGE_LABELS } from "@/lib/customers";

// Name search runs in the browser over the customers already loaded.
export function CustomersTable({ customers, filtered }: { customers: Customer[]; filtered: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q
    ? customers.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
    : customers;

  return (
    <div className="space-y-4">
      <label className="block max-w-sm text-sm font-medium text-zinc-700">
        Search by name
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
          <p className="font-medium text-zinc-900">No customers found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {q || filtered ? "No customer matches this search or these filters." : "There are no customers yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Total Dives</TableHead>
                <TableHead className="text-right">Loyalty Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.firstName} {c.lastName}
                  </TableCell>
                  <TableCell>{countryLabel(c.country)}</TableCell>
                  <TableCell>{LANGUAGE_LABELS[c.language] ?? c.language}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.totalDives}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.loyaltyPoints}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/dashboard/customers/${c.id}`} prefetch={false} />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-zinc-500">
        {rows.length} of {customers.length} customer{customers.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
