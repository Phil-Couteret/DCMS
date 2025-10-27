// Mock Data for DCMS PWA Prototype
// All data stored in localStorage for persistence

export const initialMockData = {
  bookings: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440020',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      boatId: '550e8400-e29b-41d4-a716-446655440004',
      diveSiteId: '550e8400-e29b-41d4-a716-446655440005',
      bookingDate: new Date().toISOString().split('T')[0],
      activityType: 'diving',
      numberOfDives: 1,
      price: 46.00,
      discount: 0,
      totalPrice: 46.00,
      status: 'confirmed',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      equipmentNeeded: ['BCD', 'Regulator', 'Mask', 'Fins'],
      notes: 'First time diver'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      customerId: '550e8400-e29b-41d4-a716-446655440021',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      boatId: '550e8400-e29b-41d4-a716-446655440005',
      diveSiteId: '550e8400-e29b-41d4-a716-446655440006',
      bookingDate: new Date().toISOString().split('T')[0],
      activityType: 'diving',
      numberOfDives: 2,
      price: 88.00,
      discount: 0,
      totalPrice: 88.00,
      status: 'confirmed',
      paymentMethod: 'cash',
      paymentStatus: 'paid'
    }
  ],
  
  customers: [
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '+44 7700 900123',
      dob: '1985-05-15',
      nationality: 'British',
      customerType: 'tourist',
      preferences: {
        equipmentSize: 'M',
        wetsuitSize: 'M',
        favoriteBoat: 'White Magic'
      },
      medicalConditions: [],
      notes: 'Prefers morning dives'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@example.com',
      phone: '+34 612 345 678',
      dob: '1990-08-20',
      nationality: 'Spanish',
      customerType: 'local',
      preferences: {
        equipmentSize: 'S',
        wetsuitSize: 'S'
      },
      medicalConditions: [],
      notes: 'Regular customer'
    }
  ],
  
  equipment: [
    {
      id: '550e8400-e29b-41d4-a716-446655440030',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD',
      category: 'diving',
      type: 'diving',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'BCD-001',
      isAvailable: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440031',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator',
      category: 'diving',
      type: 'diving',
      size: null,
      condition: 'excellent',
      serialNumber: 'REG-001',
      isAvailable: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440032',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm',
      category: 'diving',
      type: 'diving',
      size: 'S',
      condition: 'excellent',
      isAvailable: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440033',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask',
      category: 'diving',
      type: 'diving',
      size: null,
      condition: 'excellent',
      isAvailable: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440034',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins',
      category: 'diving',
      type: 'diving',
      size: '42',
      condition: 'excellent',
      isAvailable: true
    }
  ],
  
  boats: [
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'White Magic',
      capacity: 10,
      equipmentOnboard: ['oxygen', 'first_aid', 'radio', 'mobile_phone', 'gps', 'life_jackets', 'flares'],
      isActive: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Grey Magic',
      capacity: 10,
      equipmentOnboard: ['oxygen', 'first_aid', 'radio', 'mobile_phone', 'gps', 'life_jackets', 'flares'],
      isActive: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Black Magic',
      capacity: 10,
      equipmentOnboard: ['oxygen', 'first_aid', 'radio', 'mobile_phone', 'gps', 'life_jackets', 'flares'],
      isActive: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Blue Magic',
      capacity: 10,
      equipmentOnboard: ['oxygen', 'first_aid', 'radio', 'mobile_phone', 'gps', 'life_jackets', 'flares'],
      isActive: true
    }
  ],
  
  diveSites: [
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Castillo Reef',
      type: 'diving',
      depthRange: { min: 5, max: 18 },
      difficultyLevel: 'intermediate'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Salinas Reef',
      type: 'diving',
      depthRange: { min: 8, max: 25 },
      difficultyLevel: 'intermediate'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Nuevo Horizonte Reef',
      type: 'diving',
      depthRange: { min: 10, max: 30 },
      difficultyLevel: 'advanced'
    }
  ],
  
  locations: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Caleta de Fuste',
      type: 'diving',
      address: {
        street: 'Muelle Deportivo / Calle Teneriffe',
        city: 'Caleta de Fuste',
        postalCode: '35610',
        country: 'Spain'
      },
      isActive: true
    }
  ],
  
  pricingConfig: {
    tiers: [
      { dives: 1, price: 46 },
      { dives: 2, price: 44 },
      { dives: 3, price: 44 },
      { dives: 4, price: 42 },
      { dives: 5, price: 42 },
      { dives: 6, price: 42 },
      { dives: 7, price: 40 },
      { dives: 8, price: 40 },
      { dives: 9, price: 38 }
    ],
    addons: {
      nightDive: 20,
      personalInstructor: 100
    }
  },
  
  governmentBonos: [
    {
      id: '550e8400-e29b-41d4-a716-446655440040',
      code: 'BONO-2025-001',
      type: 'discount_code',
      discountPercentage: 20,
      maxAmount: 200,
      validFrom: '2025-01-01',
      validUntil: '2025-12-31',
      isActive: true
    }
  ]
};

// Initialize localStorage with mock data if not already initialized
export const initializeMockData = () => {
  if (!localStorage.getItem('dcms_bookings')) {
    localStorage.setItem('dcms_bookings', JSON.stringify(initialMockData.bookings));
    localStorage.setItem('dcms_customers', JSON.stringify(initialMockData.customers));
    localStorage.setItem('dcms_equipment', JSON.stringify(initialMockData.equipment));
    localStorage.setItem('dcms_boats', JSON.stringify(initialMockData.boats));
    localStorage.setItem('dcms_diveSites', JSON.stringify(initialMockData.diveSites));
    localStorage.setItem('dcms_locations', JSON.stringify(initialMockData.locations));
    localStorage.setItem('dcms_pricingConfig', JSON.stringify(initialMockData.pricingConfig));
    localStorage.setItem('dcms_governmentBonos', JSON.stringify(initialMockData.governmentBonos));
  }
};

export default initialMockData;

