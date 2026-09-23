// Phase 6.5b extraction: shared between hooks/useScheduleData.js (mole slot
// generation) and components/Schedule/SlotDetailView.jsx (mole slot
// generation + boat session lookup) - previously module-level consts in
// Schedule.jsx that both the main component and the SlotDetailView
// subcomponent (defined lower in the same file) relied on via same-module
// scope. Split into their own file so both can import it explicitly.

// Slot configuration for Mole (discovery)
export const MOLE_START_TIME = '09:30';
export const MOLE_SLOT_DURATION = 60; // 1 hour in minutes
export const MOLE_SLOT_INTERVAL = 30; // 30 minutes between slots

// Boat slot configuration (morning, afternoon, night sessions)
export const BOAT_SESSIONS = [
  { name: 'Morning', time: '09:00', duration: 240 },
  { name: 'Afternoon', time: '12:00', duration: 240 },
  { name: 'Night', time: '18:00', duration: 120 }
];
