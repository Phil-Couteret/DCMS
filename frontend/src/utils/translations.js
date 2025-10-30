// Translation strings for DCMS PWA
// Supports: Spanish, English, German

// Translation strings
export const translations = {
  es: {
    // Navigation
    nav: {
      dashboard: 'Panel de Control',
      bookings: 'Reservas',
      newBooking: 'Nueva Reserva',
      customers: 'Clientes',
      equipment: 'Equipamiento',
      settings: 'Configuración'
    },
    // Dashboard
    dashboard: {
      title: 'Panel de Control',
      todayBookings: 'Reservas de Hoy',
      todayRevenue: 'Ingresos de Hoy',
      totalBookings: 'Reservas Totales',
      totalRevenue: 'Ingresos Totales',
      newBooking: 'Nueva Reserva'
    },
    // Bookings
    bookings: {
      title: 'Reservas',
      new: 'Nueva Reserva',
      noBookings: 'No hay reservas',
      createFirst: 'Crear Primera Reserva',
      edit: 'Editar',
      status: {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        completed: 'Completado',
        cancelled: 'Cancelado'
      }
    },
    // Customers
    customers: {
      title: 'Clientes',
      new: 'Nuevo Cliente',
      noCustomers: 'No hay clientes',
      createFirst: 'Crear Primer Cliente',
      search: 'Buscar clientes por nombre, email o teléfono...',
      edit: 'Editar',
      nationality: 'Nacionalidad',
      type: 'Tipo'
    },
    // Equipment
    equipment: {
      title: 'Equipamiento',
      total: 'Equipamiento Total',
      available: 'Disponible',
      inUse: 'En Uso',
      search: 'Buscar equipamiento...',
      noEquipment: 'No hay equipamiento registrado',
      category: 'Categoría',
      size: 'Talla',
      serial: 'Número de Serie',
      condition: {
        excellent: 'Excelente',
        good: 'Bueno',
        fair: 'Regular',
        poor: 'Pobre'
      }
    },
    // Common
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      search: 'Buscar',
      edit: 'Editar',
      delete: 'Eliminar',
      loading: 'Cargando...',
      saved: 'Guardado con éxito',
      error: 'Error'
    }
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      bookings: 'Bookings',
      newBooking: 'New Booking',
      customers: 'Customers',
      equipment: 'Equipment',
      settings: 'Settings'
    },
    dashboard: {
      title: 'Dashboard',
      todayBookings: "Today's Bookings",
      todayRevenue: "Today's Revenue",
      totalBookings: 'Total Bookings',
      totalRevenue: 'Total Revenue',
      newBooking: 'New Booking'
    },
    bookings: {
      title: 'Bookings',
      new: 'New Booking',
      noBookings: 'No bookings yet',
      createFirst: 'Create First Booking',
      edit: 'Edit',
      status: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled'
      }
    },
    customers: {
      title: 'Customers',
      new: 'New Customer',
      noCustomers: 'No customers yet',
      createFirst: 'Create First Customer',
      search: 'Search customers by name, email, or phone...',
      edit: 'Edit',
      nationality: 'Nationality',
      type: 'Type'
    },
    equipment: {
      title: 'Equipment',
      total: 'Total Equipment',
      available: 'Available',
      inUse: 'In Use',
      search: 'Search equipment...',
      noEquipment: 'No equipment registered',
      category: 'Category',
      size: 'Size',
      serial: 'Serial Number',
      condition: {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor'
      }
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      search: 'Search',
      edit: 'Edit',
      delete: 'Delete',
      loading: 'Loading...',
      saved: 'Saved successfully',
      error: 'Error'
    }
  },
  de: {
    nav: {
      dashboard: 'Armaturenbrett',
      bookings: 'Buchungen',
      newBooking: 'Neue Buchung',
      customers: 'Kunden',
      equipment: 'Ausrüstung',
      settings: 'Einstellungen'
    },
    dashboard: {
      title: 'Armaturenbrett',
      todayBookings: 'Heutige Buchungen',
      todayRevenue: 'Heutiger Umsatz',
      totalBookings: 'Gesamtbuchungen',
      totalRevenue: 'Gesamtumsatz',
      newBooking: 'Neue Buchung'
    },
    bookings: {
      title: 'Buchungen',
      new: 'Neue Buchung',
      noBookings: 'Noch keine Buchungen',
      createFirst: 'Erste Buchung erstellen',
      edit: 'Bearbeiten',
      status: {
        pending: 'Ausstehend',
        confirmed: 'Bestätigt',
        completed: 'Abgeschlossen',
        cancelled: 'Storniert'
      }
    },
    customers: {
      title: 'Kunden',
      new: 'Neuer Kunde',
      noCustomers: 'Noch keine Kunden',
      createFirst: 'Ersten Kunden erstellen',
      search: 'Kunden suchen...',
      edit: 'Bearbeiten',
      nationality: 'Nationalität',
      type: 'Typ'
    },
    equipment: {
      title: 'Ausrüstung',
      total: 'Gesamtausrüstung',
      available: 'Verfügbar',
      inUse: 'In Verwendung',
      search: 'Ausrüstung suchen...',
      noEquipment: 'Keine Ausrüstung registriert',
      category: 'Kategorie',
      size: 'Größe',
      serial: 'Seriennummer',
      condition: {
        excellent: 'Ausgezeichnet',
        good: 'Gut',
        fair: 'Zufriedenstellend',
        poor: 'Schlecht'
      }
    },
    common: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      search: 'Suchen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      loading: 'Laden...',
      saved: 'Erfolgreich gespeichert',
      error: 'Fehler'
    }
  }
};

// Get translation
export const t = (key, lang = 'en') => {
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};

export default translations;

