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
      },
      details: {
        bookingId: 'ID de Reserva',
        date: 'Fecha',
        activity: 'Actividad',
        diveSessions: 'Sesiones de buceo',
        morning: 'Mañana (9:00)',
        afternoon: 'Tarde (12:00)',
        dives: 'inmersiones',
        paymentMethod: 'Método de pago',
        paymentStatus: 'Estado del pago',
        ownEquipment: 'Equipo propio',
        rentedEquipment: 'Equipo alquilado',
        specialRequirements: 'Requisitos especiales',
        notes: 'Notas'
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
      type: 'Tipo',
      unknown: 'Cliente desconocido'
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
      add: 'Añadir equipamiento',
      addTitle: 'Añadir nuevo equipamiento',
      editTitle: 'Editar equipamiento',
      type: 'Tipo',
      brand: 'Marca',
      thickness: 'Grosor',
      style: 'Estilo',
      hood: 'Capucha',
      condition: {
        excellent: 'Excelente',
        good: 'Bueno',
        fair: 'Regular',
        poor: 'Pobre'
      },
      form: {
        name: 'Nombre del equipamiento',
        category: 'Categoría',
        type: 'Tipo',
        size: 'Talla',
        serial: 'Número de Serie',
        brand: 'Marca',
        model: 'Modelo',
        thickness: 'Grosor (para trajes)',
        style: 'Estilo (para trajes)',
        hood: 'Capucha (para trajes)',
        condition: 'Condición',
        notes: 'Notas'
      },
      categories: {
        diving: 'Buceo',
        snorkeling: 'Snorkel',
        safety: 'Seguridad',
        maintenance: 'Mantenimiento',
        ownEquipment: 'Equipo propio'
      },
      bulk: {
        title: 'Importación masiva de equipamiento',
        description: 'Sube un archivo CSV con datos de equipamiento. El archivo debe tener las siguientes columnas:',
        example: 'Ejemplo:'
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
      error: 'Error',
      status: 'Estado',
      yes: 'Sí',
      no: 'No',
      close: 'Cerrar',
      update: 'Actualizar',
      add: 'Añadir',
      bulkImport: 'Importación Masiva'
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
      },
      details: {
        bookingId: 'Booking ID',
        date: 'Date',
        activity: 'Activity',
        diveSessions: 'Dive Sessions',
        morning: 'Morning (9AM)',
        afternoon: 'Afternoon (12PM)',
        dives: 'dives',
        paymentMethod: 'Payment Method',
        paymentStatus: 'Payment Status',
        ownEquipment: 'Own Equipment',
        rentedEquipment: 'Rented Equipment',
        specialRequirements: 'Special Requirements',
        notes: 'Notes'
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
      type: 'Type',
      unknown: 'Unknown Customer'
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
      add: 'Add Equipment',
      addTitle: 'Add New Equipment',
      editTitle: 'Edit Equipment',
      type: 'Type',
      brand: 'Brand',
      thickness: 'Thickness',
      style: 'Style',
      hood: 'Hood',
      condition: {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor'
      },
      form: {
        name: 'Equipment Name',
        category: 'Category',
        type: 'Type',
        size: 'Size',
        serial: 'Serial Number',
        brand: 'Brand',
        model: 'Model',
        thickness: 'Thickness (for wetsuits)',
        style: 'Style (for wetsuits)',
        hood: 'Hood (for wetsuits)',
        condition: 'Condition',
        notes: 'Notes'
      },
      categories: {
        diving: 'Diving',
        snorkeling: 'Snorkeling',
        safety: 'Safety',
        maintenance: 'Maintenance',
        ownEquipment: 'Own Equipment'
      },
      bulk: {
        title: 'Bulk Import Equipment',
        description: 'Upload a CSV file with equipment data. The file should have the following columns:',
        example: 'Example:'
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
      error: 'Error',
      status: 'Status',
      yes: 'Yes',
      no: 'No',
      close: 'Close',
      update: 'Update',
      add: 'Add',
      bulkImport: 'Bulk Import'
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
      },
      details: {
        bookingId: 'Buchungs-ID',
        date: 'Datum',
        activity: 'Aktivität',
        diveSessions: 'Tauchgänge',
        morning: 'Morgens (9:00)',
        afternoon: 'Nachmittags (12:00)',
        dives: 'Tauchgänge',
        paymentMethod: 'Zahlungsmethode',
        paymentStatus: 'Zahlungsstatus',
        ownEquipment: 'Eigene Ausrüstung',
        rentedEquipment: 'Geliehene Ausrüstung',
        specialRequirements: 'Besondere Anforderungen',
        notes: 'Notizen'
      }
    },
    customers: {
      title: 'Kunden',
      new: 'Neuer Kunde',
      noCustomers: 'Noch keine Kunden',
      createFirst: 'Ersten Kunden erstellen',
      search: 'Kunden nach Name, E-Mail oder Telefon suchen...',
      edit: 'Bearbeiten',
      nationality: 'Nationalität',
      type: 'Typ',
      unknown: 'Unbekannter Kunde'
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
      add: 'Ausrüstung hinzufügen',
      addTitle: 'Neue Ausrüstung hinzufügen',
      editTitle: 'Ausrüstung bearbeiten',
      type: 'Typ',
      brand: 'Marke',
      thickness: 'Dicke',
      style: 'Stil',
      hood: 'Haube',
      condition: {
        excellent: 'Ausgezeichnet',
        good: 'Gut',
        fair: 'Zufriedenstellend',
        poor: 'Schlecht'
      },
      form: {
        name: 'Ausrüstungsname',
        category: 'Kategorie',
        type: 'Typ',
        size: 'Größe',
        serial: 'Seriennummer',
        brand: 'Marke',
        model: 'Modell',
        thickness: 'Dicke (für Neoprenanzüge)',
        style: 'Stil (für Neoprenanzüge)',
        hood: 'Haube (für Neoprenanzüge)',
        condition: 'Zustand',
        notes: 'Notizen'
      },
      categories: {
        diving: 'Tauchen',
        snorkeling: 'Schnorcheln',
        safety: 'Sicherheit',
        maintenance: 'Wartung',
        ownEquipment: 'Eigene Ausrüstung'
      },
      bulk: {
        title: 'Stapelimport Ausrüstung',
        description: 'Laden Sie eine CSV-Datei mit Ausrüstungsdaten hoch. Die Datei sollte die folgenden Spalten enthalten:',
        example: 'Beispiel:'
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
      error: 'Fehler',
      status: 'Status',
      yes: 'Ja',
      no: 'Nein',
      close: 'Schließen',
      update: 'Aktualisieren',
      add: 'Hinzufügen',
      bulkImport: 'Stapelimport'
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

