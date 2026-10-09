"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setApproval } from "@/app/dashboard/customers/actions";
import { ActionButton } from "@/components/customers/profile-actions";
import type { Customer } from "@/lib/api";
import { countryName } from "@/lib/countries";
import { CUSTOMER_TYPE_LABELS, LANGUAGE_LABELS, SKILL_LEVEL_LABELS } from "@/lib/customers";
import { useT } from "@/lib/i18n/client";

// Search runs in the browser over the customers already loaded: by name or
// email, or by phone number whatever its spacing and punctuation.
function matches(c: Customer, q: string) {
  if (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits);
}

export function CustomersTable({ customers, filtered }: { customers: Customer[]; filtered: boolean }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q ? customers.filter((c) => matches(c, q)) : customers;

  return (
    <div className="space-y-4">
      <label className="block max-w-sm text-sm font-medium text-zinc-700">
        {t("Search by name, email or phone")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("e.g. Ana Diaz, ana@example.com, 612 345 678")}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No customers found")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {q || filtered ? t("No customer matches this search or these filters.") : t("There are no customers yet.")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Country")}</TableHead>
                <TableHead>{t("Language")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Skill Level")}</TableHead>
                <TableHead className="text-right">{t("Total Dives")}</TableHead>
                <TableHead className="text-right">{t("Loyalty Points")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.firstName} {c.lastName}
                  </TableCell>
                  <TableCell>{countryName(c.country)}</TableCell>
                  <TableCell>{LANGUAGE_LABELS[c.language] ? t(LANGUAGE_LABELS[c.language]) : c.language}</TableCell>
                  <TableCell>{CUSTOMER_TYPE_LABELS[c.customerType] ? t(CUSTOMER_TYPE_LABELS[c.customerType]) : c.customerType}</TableCell>
                  <TableCell>
                    {c.centerSkillLevel ? (
                      t(SKILL_LEVEL_LABELS[c.centerSkillLevel])
                    ) : (
                      <span className="text-zinc-400">{t("Not assessed")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.totalDives}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.loyaltyPoints}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <ActionButton
                        action={setApproval}
                        fields={{ customerId: c.id, approve: String(!c.isApproved) }}
                        pendingLabel={t("Saving…")}
                        variant={c.isApproved ? "ghost" : "default"}
                        confirm={c.isApproved ? t("Revoke {name}'s approval to book online?", { name: `${c.firstName} ${c.lastName}` }) : undefined}
                      >
                        {c.isApproved ? t("Revoke") : t("Approve")}
                      </ActionButton>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/dashboard/customers/${c.id}`} prefetch={false} />}
                      >
                        {t("View")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-zinc-500">
        {customers.length === 1
          ? t("{shown} of 1 customer", { shown: rows.length })
          : t("{shown} of {count} customers", { shown: rows.length, count: customers.length })}
      </p>
    </div>
  );
}
