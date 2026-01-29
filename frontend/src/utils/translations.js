// Translation strings for DCMS PWA
// Supports: Spanish, English, German, Catalan, French

// Translation strings
export const translations = {
  es: {
    settings: {
      title: 'Configuración',
      subtitle: 'Configurar opciones y preferencias del sistema',
      tabs: { certification: 'Verificación de certificación', prices: 'Precios', users: 'Gestión de usuarios' },
      cert: {
        title: 'Verificación de certificación',
        subtitle: 'Configurar URLs de verificación para las agencias',
        description: 'Configura las URLs del portal de verificación para cada agencia. Estas URLs se abrirán en ventanas emergentes al verificar certificaciones.',
        verificationUrl: 'URL de verificación',
        enterUrl: 'Introducir',
        portalUrl: 'URL del portal de verificación',
        test: 'Probar URL',
        save: 'Guardar configuración de certificación'
      },
      tip: 'Consejo',
      tipText: 'Asegúrate de que las URLs sean correctas y accesibles. Puedes probar cada URL con el botón "Probar URL". Si se bloquea un popup, revisa la configuración del bloqueador de ventanas emergentes del navegador.',
      users: {
        addTitle: 'Añadir nuevo usuario',
        editTitle: 'Editar usuario',
        username: 'Usuario',
        fullName: 'Nombre completo',
        role: 'Rol',
        locationAccess: 'Acceso por ubicación',
        allLocations: 'Todas las ubicaciones (acceso global)',
        locationHint: 'Selecciona ubicaciones o elige "Todas las ubicaciones" para acceso global',
        globalAccess: 'Acceso global a ubicaciones actuales y futuras',
        accessTo: 'Acceso a',
        locations: 'ubicaciones',
        active: 'Activo',
        create: 'Crear',
        manageHelp: 'Gestiona usuarios y sus roles. Los administradores tienen acceso total; los guías, acceso a reservas, clientes y equipamiento.',
        addUser: 'Añadir usuario',
        name: 'Nombre',
        status: 'Estado',
        actions: 'Acciones',
        inactive: 'Inactivo',
        noPermission: 'No tienes permisos para gestionar usuarios. Solo los administradores pueden acceder a esta sección.'
      },
      roles: { admin: 'Admin', boatPilot: 'Patrón', guide: 'Guía', trainer: 'Instructor', intern: 'Becario' }
    },
    stays: {
      title: 'Estancias de clientes',
      loading: 'Cargando estancias...',
      refresh: 'Actualizar',
      empty: 'No se encontraron estancias activas',
      emptyHint: 'Los clientes con reservas en los últimos 30 días aparecerán aquí',
      started: 'Estancia iniciada',
      each: 'cada uno',
      breakdownTitle: 'Detalle de la estancia',
      table: {
        date: 'Fecha',
        sessions: 'Sesiones',
        dives: 'Inmersiones',
        pricePerDive: 'Precio por inmersión',
        total: 'Total'
      },
      cumulativeTitle: 'Precios acumulativos',
      cumulativeTextPart1: 'Todas las inmersiones de esta estancia se cobran a',
      cumulativeTextPart2: 'por inmersión en función del volumen total de',
      cumulativeTextPart3: 'Esto garantiza la mejor tarifa para toda la estancia.',
      addBooking: 'Añadir reserva',
      viewCustomer: 'Ver cliente',
      endStay: 'Finalizar estancia y generar factura',
      noSessions: 'Sin sesiones',
      status: { new: 'Nueva estancia', low: 'Bajo volumen', medium: 'Volumen medio', high: 'Alto volumen' }
    },
    // Navigation
    nav: {
      dashboard: 'Panel de Control',
      global: 'Global',
      bookings: 'Reservas',
      newBooking: 'Nueva Reserva',
      stays: 'Estancias de clientes',
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
      unknown: 'Cliente desconocido',
      medicalCertificate: 'Certificado médico',
      divingInsurance: 'Seguro de buceo',
      verified: 'Verificado',
      notVerified: 'No verificado',
      pendingVerification: 'Verificación pendiente',
      needsVerification: 'Necesita verificación',
      verificationRequired: 'Verificación requerida',
      verifiedOn: 'Verificado el',
      expires: 'Caduca',
      certifications: 'Certificaciones'
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
    settings: {
      title: 'Settings',
      subtitle: 'Configure system settings and preferences',
      tabs: { certification: 'Certification Verification', prices: 'Prices', users: 'User Management' },
      cert: {
        title: 'Certification Verification',
        subtitle: 'Configure verification portal URLs for certification agencies',
        description: 'Configure the verification portal URLs for each certification agency. These URLs will be opened in popup windows when verifying customer certifications.',
        verificationUrl: 'Verification URL',
        enterUrl: 'Enter',
        portalUrl: 'verification portal URL',
        test: 'Test URL',
        save: 'Save Certification Settings'
      },
      tip: 'Tip',
      tipText: 'Make sure the URLs are correct and accessible. You can test each URL using the "Test URL" button. If a popup is blocked, check your browser\'s popup blocker settings.',
      users: {
        addTitle: 'Add New User',
        editTitle: 'Edit User',
        username: 'Username',
        fullName: 'Full Name',
        role: 'Role',
        locationAccess: 'Location Access',
        allLocations: 'All Locations (Global Access)',
        locationHint: 'Select locations or choose "All Locations" for global access',
        globalAccess: 'Global access to all current and future locations',
        accessTo: 'Access to',
        locations: 'locations',
        active: 'Active',
        create: 'Create',
        manageHelp: 'Manage system users and their roles. Admins have full access, guides can access bookings, customers, and equipment.',
        addUser: 'Add User',
        name: 'Name',
        status: 'Status',
        actions: 'Actions',
        inactive: 'Inactive',
        noPermission: "You don't have permission to manage users. Only administrators can access this section."
      },
      roles: { admin: 'Admin', boatPilot: 'Boat Pilot', guide: 'Guide', trainer: 'Trainer', intern: 'Intern' }
    },
    stays: {
      title: 'Current Customers',
      loading: 'Loading stays...',
      refresh: 'Refresh',
      empty: 'No active stays found',
      emptyHint: 'Customers with bookings in the last 30 days will appear here',
      started: 'Stay started',
      each: 'each',
      breakdownTitle: 'Stay Breakdown',
      table: {
        date: 'Date',
        sessions: 'Sessions',
        dives: 'Dives',
        pricePerDive: 'Price per Dive',
        total: 'Total'
      },
      cumulativeTitle: 'Cumulative Pricing',
      cumulativeTextPart1: 'All dives in this stay are priced at',
      cumulativeTextPart2: 'per dive based on the total volume of',
      cumulativeTextPart3: 'This ensures customers get the best possible rate for their entire stay.',
      addBooking: 'Add Booking',
      viewCustomer: 'View Customer',
      endStay: 'End Stay & Generate Bill',
      noSessions: 'No sessions',
      status: { new: 'New Stay', low: 'Low Volume', medium: 'Medium Volume', high: 'High Volume' }
    },
    nav: {
      dashboard: 'Dashboard',
      global: 'Global',
      bookings: 'Bookings',
      newBooking: 'New Booking',
      stays: 'Current Customers',
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
      unknown: 'Unknown Customer',
      medicalCertificate: 'Medical Certificate',
      divingInsurance: 'Diving Insurance',
      verified: 'Verified',
      notVerified: 'Not Verified',
      pendingVerification: 'Pending Verification',
      needsVerification: 'Needs verification',
      verificationRequired: 'Verification required',
      verifiedOn: 'Verified on',
      expires: 'Expires',
      certifications: 'Certifications'
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
    settings: {
      title: 'Einstellungen',
      subtitle: 'Systemeinstellungen und Präferenzen konfigurieren',
      tabs: { certification: 'Zertifikatsprüfung', prices: 'Preise', users: 'Benutzerverwaltung' },
      cert: {
        title: 'Zertifikatsprüfung',
        subtitle: 'Überprüfungs-URLs für Zertifizierungsstellen konfigurieren',
        description: 'Konfigurieren Sie die Überprüfungsportale für jede Zertifizierungsstelle. Diese URLs werden in Popups geöffnet, wenn Zertifikate geprüft werden.',
        verificationUrl: 'Prüf-URL',
        enterUrl: 'URL eingeben',
        portalUrl: 'Überprüfungsportal-URL',
        test: 'URL testen',
        save: 'Zertifikats-Einstellungen speichern'
      },
      tip: 'Hinweis',
      tipText: 'Stellen Sie sicher, dass die URLs korrekt und erreichbar sind. Sie können jede URL mit der Schaltfläche "URL testen" prüfen. Wenn ein Popup blockiert wird, prüfen Sie die Popup-Blocker-Einstellungen Ihres Browsers.',
      users: {
        addTitle: 'Neuen Benutzer hinzufügen',
        editTitle: 'Benutzer bearbeiten',
        username: 'Benutzername',
        fullName: 'Vollständiger Name',
        role: 'Rolle',
        locationAccess: 'Zugriff nach Standort',
        allLocations: 'Alle Standorte (globaler Zugriff)',
        locationHint: 'Wählen Sie Standorte oder "Alle Standorte" für globalen Zugriff',
        globalAccess: 'Globaler Zugriff auf aktuelle und zukünftige Standorte',
        accessTo: 'Zugriff auf',
        locations: 'Standorte',
        active: 'Aktiv',
        create: 'Erstellen',
        manageHelp: 'Verwalten Sie Benutzer und ihre Rollen. Administratoren haben vollen Zugriff; Guides haben Zugriff auf Buchungen, Kunden und Ausrüstung.',
        addUser: 'Benutzer hinzufügen',
        name: 'Name',
        status: 'Status',
        actions: 'Aktionen',
        inactive: 'Inaktiv',
        noPermission: 'Sie haben keine Berechtigung, Benutzer zu verwalten. Nur Administratoren können auf diesen Bereich zugreifen.'
      },
      roles: { admin: 'Admin', boatPilot: 'Bootsführer', guide: 'Guide', trainer: 'Trainer', intern: 'Praktikant' }
    },
    stays: {
      title: 'Kundenaufenthalte',
      loading: 'Aufenthalte werden geladen...',
      refresh: 'Aktualisieren',
      empty: 'Keine aktiven Aufenthalte gefunden',
      emptyHint: 'Kunden mit Buchungen in den letzten 30 Tagen werden hier angezeigt',
      started: 'Aufenthalt begonnen',
      each: 'je',
      breakdownTitle: 'Aufenthaltsübersicht',
      table: {
        date: 'Datum',
        sessions: 'Sitzungen',
        dives: 'Tauchgänge',
        pricePerDive: 'Preis pro Tauchgang',
        total: 'Gesamt'
      },
      cumulativeTitle: 'Kumulierte Preisgestaltung',
      cumulativeTextPart1: 'Alle Tauchgänge in diesem Aufenthalt kosten',
      cumulativeTextPart2: 'pro Tauchgang basierend auf der Gesamtzahl von',
      cumulativeTextPart3: 'Dies stellt sicher, dass Kunden den bestmöglichen Preis für den gesamten Aufenthalt erhalten.',
      addBooking: 'Buchung hinzufügen',
      viewCustomer: 'Kunden anzeigen',
      endStay: 'Aufenthalt beenden & Rechnung erzeugen',
      noSessions: 'Keine Sitzungen',
      status: { new: 'Neuer Aufenthalt', low: 'Geringes Volumen', medium: 'Mittleres Volumen', high: 'Hohes Volumen' }
    },
    nav: {
      dashboard: 'Armaturenbrett',
      global: 'Global',
      bookings: 'Buchungen',
      newBooking: 'Neue Buchung',
      stays: 'Kundenaufenthalte',
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
      unknown: 'Unbekannter Kunde',
      medicalCertificate: 'Ärztliches Attest',
      divingInsurance: 'Tauchversicherung',
      verified: 'Verifiziert',
      notVerified: 'Nicht verifiziert',
      pendingVerification: 'Überprüfung ausstehend',
      needsVerification: 'Überprüfung erforderlich',
      verificationRequired: 'Überprüfung erforderlich',
      verifiedOn: 'Verifiziert am',
      expires: 'Gültig bis',
      certifications: 'Zertifizierungen'
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
  },
  ca: {
    settings: {
      title: 'Configuració',
      subtitle: 'Configurar opcions i preferències del sistema',
      tabs: { certification: 'Verificació de certificació', prices: 'Preus', users: 'Gestió d\'usuaris' },
      cert: {
        title: 'Verificació de certificació',
        subtitle: 'Configurar URLs de verificació per a les agències',
        description: 'Configura les URLs del portal de verificació per a cada agència. Aquestes URLs s\'obriran en finestres emergents en verificar certificacions.',
        verificationUrl: 'URL de verificació',
        enterUrl: 'Introduir',
        portalUrl: 'URL del portal de verificació',
        test: 'Provar URL',
        save: 'Desar configuració de certificació'
      },
      tip: 'Consell',
      tipText: 'Assegura\'t que les URLs siguin correctes i accessibles. Pots provar cada URL amb el botó "Provar URL". Si es bloqueja un popup, revisa la configuració del bloqueador de finestres emergents del navegador.',
      users: {
        addTitle: 'Afegir nou usuari',
        editTitle: 'Editar usuari',
        username: 'Usuari',
        fullName: 'Nom complet',
        role: 'Rol',
        locationAccess: 'Accés per ubicació',
        allLocations: 'Totes les ubicacions (accés global)',
        locationHint: 'Selecciona ubicacions o tria "Totes les ubicacions" per accés global',
        globalAccess: 'Accés global a totes les ubicacions actuals i futures',
        accessTo: 'Accés a',
        locations: 'ubicacions',
        active: 'Actiu',
        create: 'Crear',
        manageHelp: 'Gestiona usuaris i els seus rols. Els administradors tenen accés total; els guies, accés a reserves, clients i equipament.',
        addUser: 'Afegir usuari',
        name: 'Nom',
        status: 'Estat',
        actions: 'Accions',
        inactive: 'Inactiu',
        noPermission: 'No tens permisos per gestionar usuaris. Només els administradors poden accedir a aquesta secció.'
      },
      roles: { admin: 'Admin', boatPilot: 'Patró', guide: 'Guia', trainer: 'Instructor', intern: 'Becari' }
    },
    stays: {
      title: 'Estades de clients',
      loading: 'Carregant estades...',
      refresh: 'Actualitzar',
      empty: 'No s\'han trobat estades actives',
      emptyHint: 'Els clients amb reserves els últims 30 dies apareixeran aquí',
      started: 'Estada iniciada',
      each: 'cada un',
      breakdownTitle: 'Detall de l\'estada',
      table: {
        date: 'Data',
        sessions: 'Sessions',
        dives: 'Immersions',
        pricePerDive: 'Preu per immersió',
        total: 'Total'
      },
      cumulativeTitle: 'Preus acumulatius',
      cumulativeTextPart1: 'Totes les immersions d\'aquesta estada es cobren a',
      cumulativeTextPart2: 'per immersió en funció del volum total de',
      cumulativeTextPart3: 'Això garanteix la millor tarifa per a tota l\'estada.',
      addBooking: 'Afegir reserva',
      viewCustomer: 'Veure client',
      endStay: 'Finalitzar estada i generar factura',
      noSessions: 'Sense sessions',
      status: { new: 'Nova estada', low: 'Baix volum', medium: 'Volum mitjà', high: 'Alt volum' }
    },
    nav: {
      dashboard: 'Panell de Control',
      global: 'Global',
      bookings: 'Reserves',
      newBooking: 'Nova Reserva',
      stays: 'Estades de clients',
      customers: 'Clients',
      equipment: 'Equipament',
      settings: 'Configuració'
    },
    dashboard: {
      title: 'Panell de Control',
      todayBookings: 'Reserves d\'Avui',
      todayRevenue: 'Ingressos d\'Avui',
      totalBookings: 'Reserves Totals',
      totalRevenue: 'Ingressos Totals',
      newBooking: 'Nova Reserva'
    },
    bookings: {
      title: 'Reserves',
      new: 'Nova Reserva',
      noBookings: 'No hi ha reserves',
      createFirst: 'Crear Primera Reserva',
      edit: 'Editar',
      status: {
        pending: 'Pendent',
        confirmed: 'Confirmada',
        completed: 'Completada',
        cancelled: 'Cancel·lada'
      },
      details: {
        bookingId: 'ID de Reserva',
        date: 'Data',
        activity: 'Activitat',
        diveSessions: 'Sessions de busseig',
        morning: 'Matí (9:00)',
        afternoon: 'Tarda (12:00)',
        dives: 'immersions',
        paymentMethod: 'Mètode de pagament',
        paymentStatus: 'Estat del pagament',
        ownEquipment: 'Equip propi',
        rentedEquipment: 'Equip llogat',
        specialRequirements: 'Requisits especials',
        notes: 'Notes'
      }
    },
    customers: {
      title: 'Clients',
      new: 'Nou Client',
      noCustomers: 'No hi ha clients',
      createFirst: 'Crear Primer Client',
      search: 'Cercar clients per nom, email o telèfon...',
      edit: 'Editar',
      nationality: 'Nacionalitat',
      type: 'Tipus',
      unknown: 'Client desconegut',
      medicalCertificate: 'Certificat mèdic',
      divingInsurance: 'Assegurança de busseig',
      verified: 'Verificat',
      notVerified: 'No verificat',
      pendingVerification: 'Verificació pendent',
      needsVerification: 'Necessita verificació',
      verificationRequired: 'Verificació requerida',
      verifiedOn: 'Verificat el',
      expires: 'Caduca',
      certifications: 'Certificacions'
    },
    equipment: {
      title: 'Equipament',
      total: 'Equipament Total',
      available: 'Disponible',
      inUse: 'En Ús',
      search: 'Cercar equipament...',
      noEquipment: 'No hi ha equipament registrat',
      category: 'Categoria',
      size: 'Mida',
      serial: 'Número de Sèrie',
      add: 'Afegir equipament',
      addTitle: 'Afegir nou equipament',
      editTitle: 'Editar equipament',
      type: 'Tipus',
      brand: 'Marca',
      thickness: 'Gruix',
      style: 'Estil',
      hood: 'Caputxa',
      condition: {
        excellent: 'Excel·lent',
        good: 'Bo',
        fair: 'Regular',
        poor: 'Pobre'
      },
      form: {
        name: 'Nom de l\'equipament',
        category: 'Categoria',
        type: 'Tipus',
        size: 'Mida',
        serial: 'Número de Sèrie',
        brand: 'Marca',
        model: 'Model',
        thickness: 'Gruix (per vestits)',
        style: 'Estil (per vestits)',
        hood: 'Caputxa (per vestits)',
        condition: 'Condició',
        notes: 'Notes'
      },
      categories: {
        diving: 'Busseig',
        snorkeling: 'Snorkel',
        safety: 'Seguretat',
        maintenance: 'Manteniment',
        ownEquipment: 'Equip propi'
      },
      bulk: {
        title: 'Importació massiva d\'equipament',
        description: 'Puja un fitxer CSV amb dades d\'equipament. El fitxer ha de tenir les següents columnes:',
        example: 'Exemple:'
      }
    },
    common: {
      save: 'Desar',
      cancel: 'Cancel·lar',
      search: 'Cercar',
      edit: 'Editar',
      delete: 'Eliminar',
      loading: 'Carregant...',
      saved: 'Desat amb èxit',
      error: 'Error',
      status: 'Estat',
      yes: 'Sí',
      no: 'No',
      close: 'Tancar',
      update: 'Actualitzar',
      add: 'Afegir',
      bulkImport: 'Importació Massiva'
    }
  },
  fr: {
    settings: {
      title: 'Paramètres',
      subtitle: 'Configurer les paramètres et préférences du système',
      tabs: { certification: 'Vérification des certifications', prices: 'Tarifs', users: 'Gestion des utilisateurs' },
      cert: {
        title: 'Vérification des certifications',
        subtitle: 'Configurer les URLs des portails de vérification pour les agences',
        description: 'Configurez les URLs des portails de vérification pour chaque agence. Ces URLs s\'ouvriront dans des fenêtres popup lors de la vérification des certifications clients.',
        verificationUrl: 'URL de vérification',
        enterUrl: 'Saisir',
        portalUrl: 'URL du portail de vérification',
        test: 'Tester l\'URL',
        save: 'Enregistrer les paramètres de certification'
      },
      tip: 'Conseil',
      tipText: 'Assurez-vous que les URLs sont correctes et accessibles. Vous pouvez tester chaque URL avec le bouton "Tester l\'URL". Si une popup est bloquée, vérifiez les paramètres du bloqueur de fenêtres popup de votre navigateur.',
      users: {
        addTitle: 'Ajouter un utilisateur',
        editTitle: 'Modifier l\'utilisateur',
        username: 'Utilisateur',
        fullName: 'Nom complet',
        role: 'Rôle',
        locationAccess: 'Accès par emplacement',
        allLocations: 'Tous les emplacements (accès global)',
        locationHint: 'Sélectionnez des emplacements ou choisissez "Tous les emplacements" pour un accès global',
        globalAccess: 'Accès global à tous les emplacements actuels et futurs',
        accessTo: 'Accès à',
        locations: 'emplacements',
        active: 'Actif',
        create: 'Créer',
        manageHelp: 'Gérez les utilisateurs et leurs rôles. Les administrateurs ont un accès total ; les guides ont accès aux réservations, clients et équipement.',
        addUser: 'Ajouter un utilisateur',
        name: 'Nom',
        status: 'Statut',
        actions: 'Actions',
        inactive: 'Inactif',
        noPermission: 'Vous n\'avez pas les droits pour gérer les utilisateurs. Seuls les administrateurs peuvent accéder à cette section.'
      },
      roles: { admin: 'Admin', boatPilot: 'Capitaine', guide: 'Guide', trainer: 'Instructeur', intern: 'Stagiaire' }
    },
    stays: {
      title: 'Séjours clients',
      loading: 'Chargement des séjours...',
      refresh: 'Actualiser',
      empty: 'Aucun séjour actif trouvé',
      emptyHint: 'Les clients avec des réservations dans les 30 derniers jours apparaîtront ici',
      started: 'Séjour commencé',
      each: 'chacun',
      breakdownTitle: 'Détail du séjour',
      table: {
        date: 'Date',
        sessions: 'Sessions',
        dives: 'Plongées',
        pricePerDive: 'Prix par plongée',
        total: 'Total'
      },
      cumulativeTitle: 'Tarification cumulative',
      cumulativeTextPart1: 'Toutes les plongées de ce séjour sont facturées à',
      cumulativeTextPart2: 'par plongée en fonction du volume total de',
      cumulativeTextPart3: 'Cela garantit le meilleur tarif pour tout le séjour.',
      addBooking: 'Ajouter une réservation',
      viewCustomer: 'Voir le client',
      endStay: 'Clôturer le séjour et générer la facture',
      noSessions: 'Aucune session',
      status: { new: 'Nouveau séjour', low: 'Faible volume', medium: 'Volume moyen', high: 'Volume élevé' }
    },
    nav: {
      dashboard: 'Tableau de bord',
      global: 'Global',
      bookings: 'Réservations',
      newBooking: 'Nouvelle réservation',
      stays: 'Séjours clients',
      customers: 'Clients',
      equipment: 'Équipement',
      settings: 'Paramètres'
    },
    dashboard: {
      title: 'Tableau de bord',
      todayBookings: 'Réservations du jour',
      todayRevenue: 'Revenus du jour',
      totalBookings: 'Réservations totales',
      totalRevenue: 'Revenus totaux',
      newBooking: 'Nouvelle réservation'
    },
    bookings: {
      title: 'Réservations',
      new: 'Nouvelle réservation',
      noBookings: 'Aucune réservation',
      createFirst: 'Créer la première réservation',
      edit: 'Modifier',
      status: {
        pending: 'En attente',
        confirmed: 'Confirmée',
        completed: 'Terminée',
        cancelled: 'Annulée'
      },
      details: {
        bookingId: 'ID de réservation',
        date: 'Date',
        activity: 'Activité',
        diveSessions: 'Sessions de plongée',
        morning: 'Matin (9h)',
        afternoon: 'Après-midi (12h)',
        dives: 'plongées',
        paymentMethod: 'Mode de paiement',
        paymentStatus: 'Statut du paiement',
        ownEquipment: 'Équipement personnel',
        rentedEquipment: 'Équipement loué',
        specialRequirements: 'Exigences particulières',
        notes: 'Notes'
      }
    },
    customers: {
      title: 'Clients',
      new: 'Nouveau client',
      noCustomers: 'Aucun client',
      createFirst: 'Créer le premier client',
      search: 'Rechercher des clients par nom, email ou téléphone...',
      edit: 'Modifier',
      nationality: 'Nationalité',
      type: 'Type',
      unknown: 'Client inconnu',
      medicalCertificate: 'Certificat médical',
      divingInsurance: 'Assurance plongée',
      verified: 'Vérifié',
      notVerified: 'Non vérifié',
      pendingVerification: 'Vérification en attente',
      needsVerification: 'Nécessite une vérification',
      verificationRequired: 'Vérification requise',
      verifiedOn: 'Vérifié le',
      expires: 'Expire le',
      certifications: 'Certifications'
    },
    equipment: {
      title: 'Équipement',
      total: 'Équipement total',
      available: 'Disponible',
      inUse: 'En utilisation',
      search: 'Rechercher de l\'équipement...',
      noEquipment: 'Aucun équipement enregistré',
      category: 'Catégorie',
      size: 'Taille',
      serial: 'Numéro de série',
      add: 'Ajouter de l\'équipement',
      addTitle: 'Ajouter un nouvel équipement',
      editTitle: 'Modifier l\'équipement',
      type: 'Type',
      brand: 'Marque',
      thickness: 'Épaisseur',
      style: 'Style',
      hood: 'Cagoule',
      condition: {
        excellent: 'Excellent',
        good: 'Bon',
        fair: 'Correct',
        poor: 'Mauvais'
      },
      form: {
        name: 'Nom de l\'équipement',
        category: 'Catégorie',
        type: 'Type',
        size: 'Taille',
        serial: 'Numéro de série',
        brand: 'Marque',
        model: 'Modèle',
        thickness: 'Épaisseur (pour combinaisons)',
        style: 'Style (pour combinaisons)',
        hood: 'Cagoule (pour combinaisons)',
        condition: 'État',
        notes: 'Notes'
      },
      categories: {
        diving: 'Plongée',
        snorkeling: 'Snorkeling',
        safety: 'Sécurité',
        maintenance: 'Entretien',
        ownEquipment: 'Équipement personnel'
      },
      bulk: {
        title: 'Import en masse d\'équipement',
        description: 'Téléchargez un fichier CSV avec les données d\'équipement. Le fichier doit contenir les colonnes suivantes :',
        example: 'Exemple :'
      }
    },
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      search: 'Rechercher',
      edit: 'Modifier',
      delete: 'Supprimer',
      loading: 'Chargement...',
      saved: 'Enregistré avec succès',
      error: 'Erreur',
      status: 'Statut',
      yes: 'Oui',
      no: 'Non',
      close: 'Fermer',
      update: 'Mettre à jour',
      add: 'Ajouter',
      bulkImport: 'Import en masse'
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

