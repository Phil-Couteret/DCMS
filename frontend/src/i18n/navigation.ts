import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware Link: href="/booking" renders as /es/booking on the Spanish site.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
