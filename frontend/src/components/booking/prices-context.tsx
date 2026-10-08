'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Prices } from '@/lib/booking-catalog';

const PricesContext = createContext<Prices | null>(null);

// The price list the booking page loaded, for every step of the flow.
export function PricesProvider({ prices, children }: { prices: Prices; children: ReactNode }) {
  return <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>;
}

export function usePrices() {
  const prices = useContext(PricesContext);
  if (!prices) throw new Error('usePrices outside PricesProvider');
  return prices;
}
