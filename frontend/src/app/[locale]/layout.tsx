import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { brandVariables } from "@/lib/brand";
import { getCenter } from "@/lib/server-api";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// The center whose site this is (from the host), named in every page title.
export async function generateMetadata(): Promise<Metadata> {
  const center = await getCenter().catch(() => null);
  const name = center?.name || "Dive Center";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `${name}: book snorkeling, discover scuba, fun dives and certified dive courses.`,
    ...(center?.logoUrl && { icons: { icon: center.logoUrl } }),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Its colours (the default blues when unset or unreachable).
  const center = await getCenter().catch(() => null);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={brandVariables(center?.primaryColor ?? null, center?.accentColor ?? null)}
      >
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
