import { create } from 'zustand';
import type { ActivityType, EquipmentKey } from '@/lib/booking-catalog';

export type TimeSlot = 'MORNING' | 'AFTERNOON';

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  certificationLevel: string;
}

// Value per selected item: the chosen size, or true for items without one.
export type EquipmentSelection = Partial<Record<EquipmentKey, string | true>>;

interface BookingState {
  step: number;
  // Dive site chosen on the sites page (?site=<id>), if any.
  siteId: string | null;
  activityType: ActivityType | null;
  date: string;
  timeSlot: TimeSlot | null;
  customer: CustomerInfo;
  equipment: EquipmentSelection;
  setStep: (step: number) => void;
  setSiteId: (siteId: string | null) => void;
  selectActivity: (activityType: ActivityType) => void;
  setDate: (date: string) => void;
  setTimeSlot: (timeSlot: TimeSlot) => void;
  setCustomer: (customer: Partial<CustomerInfo>) => void;
  setEquipment: (equipment: EquipmentSelection) => void;
  reset: () => void;
}

const EMPTY_CUSTOMER: CustomerInfo = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  certificationLevel: '',
};

const INITIAL = {
  step: 1,
  siteId: null,
  activityType: null,
  date: '',
  timeSlot: null,
  customer: EMPTY_CUSTOMER,
  equipment: {},
};

export const useBookingStore = create<BookingState>()((set) => ({
  ...INITIAL,
  setStep: (step) => set({ step }),
  setSiteId: (siteId) => set({ siteId }),
  selectActivity: (activityType) => set({ activityType, step: 2 }),
  setDate: (date) => set({ date }),
  setTimeSlot: (timeSlot) => set({ timeSlot }),
  setCustomer: (customer) => set((s) => ({ customer: { ...s.customer, ...customer } })),
  setEquipment: (equipment) => set({ equipment }),
  reset: () => set(INITIAL),
}));
