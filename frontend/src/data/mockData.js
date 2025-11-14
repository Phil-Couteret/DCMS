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
      diveSessions: {
        morning: true,
        afternoon: false
      },
      price: 46.00,
      discount: 0,
      totalPrice: 46.00,
      status: 'confirmed',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      equipmentNeeded: ['BCD', 'Regulator', 'Mask', 'Fins'],
      ownEquipment: false,
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
      diveSessions: {
        morning: true,
        afternoon: true,
        night: true
      },
      price: 108.00, // 2 dives + night dive surcharge
      discount: 0,
      totalPrice: 108.00,
      status: 'confirmed',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      ownEquipment: true
    },
    // Additional test bookings for cumulative pricing demonstration
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      customerId: '550e8400-e29b-41d4-a716-446655440020', // Same customer as first booking
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      boatId: '550e8400-e29b-41d4-a716-446655440004',
      diveSiteId: '550e8400-e29b-41d4-a716-446655440005',
      bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      activityType: 'diving',
      diveSessions: {
        morning: true,
        afternoon: false
      },
      price: 46.00,
      discount: 0,
      totalPrice: 46.00,
      status: 'confirmed',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      equipmentNeeded: ['BCD', 'Regulator', 'Mask', 'Fins'],
      ownEquipment: false,
      notes: 'Second day of stay'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      customerId: '550e8400-e29b-41d4-a716-446655440020', // Same customer as first booking
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      boatId: '550e8400-e29b-41d4-a716-446655440004',
      diveSiteId: '550e8400-e29b-41d4-a716-446655440005',
      bookingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
      activityType: 'diving',
      diveSessions: {
        morning: true,
        afternoon: true
      },
      price: 88.00,
      discount: 0,
      totalPrice: 88.00,
      status: 'confirmed',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      equipmentNeeded: ['BCD', 'Regulator', 'Mask', 'Fins'],
      ownEquipment: false,
      notes: 'Third day of stay - should get volume discount'
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
        bcdSize: 'M',
        finsSize: 'M',
        bootsSize: 'M',
        wetsuitSize: 'M',
        tankSize: '12L',
        ownEquipment: false
      },
      medicalConditions: [],
      certifications: [
        {
          agency: 'PADI',
          level: 'AOW',
          certificationNumber: 'PADI-AOW-123456',
          issueDate: '2020-06-15',
          expiryDate: null,
          verified: true, // Already verified
          verifiedDate: '2025-01-10'
        }
      ],
      medicalCertificate: {
        hasCertificate: true,
        certificateNumber: 'MED-2024-001',
        issueDate: '2024-01-15',
        expiryDate: '2025-01-15',
        verified: true,
        verifiedDate: '2025-01-10'
      },
      divingInsurance: {
        hasInsurance: true,
        insuranceProvider: 'DAN Europe',
        policyNumber: 'DAN-2024-789',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
        verified: true,
        verifiedDate: '2025-01-08'
      },
      centerSkillLevel: 'beginner',
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
        bcdSize: 'S',
        finsSize: 'S',
        bootsSize: 'S',
        wetsuitSize: 'S',
        tankSize: '12L',
        ownEquipment: true
      },
      medicalConditions: [],
      certifications: [
        {
          agency: 'SSI',
          level: 'OW',
          certificationNumber: 'SSI-OW-789012',
          issueDate: '2019-03-10',
          expiryDate: null,
          verified: true, // Verified
          verifiedDate: '2025-01-08'
        },
        {
          agency: 'SSI',
          level: 'NIGHT',
          certificationNumber: 'SSI-NIGHT-345678',
          issueDate: '2021-08-15',
          expiryDate: null,
          verified: false // Not yet verified
        }
      ],
      medicalCertificate: {
        hasCertificate: false,
        certificateNumber: '',
        issueDate: '',
        expiryDate: '',
        verified: false
      },
      divingInsurance: {
        hasInsurance: true,
        insuranceProvider: 'DAN Europe',
        policyNumber: 'DAN-2024-456',
        issueDate: '2024-02-01',
        expiryDate: '2025-02-01',
        verified: false // Not yet verified
      },
      centerSkillLevel: 'intermediate',
      notes: 'Regular customer'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos.rodriguez@example.com',
      phone: '+34 666 777 888',
      dob: '1982-12-03',
      nationality: 'Spanish',
      customerType: 'recurrent',
      preferences: {
        bcdSize: 'L',
        finsSize: 'L',
        bootsSize: 'L',
        wetsuitSize: 'L',
        tankSize: '15L',
        ownEquipment: true
      },
      medicalConditions: [],
      certifications: [
        {
          agency: 'PADI',
          level: 'DM',
          certificationNumber: 'PADI-DM-456789',
          issueDate: '2018-05-20',
          expiryDate: null,
          verified: true,
          verifiedDate: '2025-01-05'
        }
      ],
      medicalCertificate: {
        hasCertificate: true,
        certificateNumber: 'MED-2024-003',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
        verified: true,
        verifiedDate: '2025-01-05'
      },
      divingInsurance: {
        hasInsurance: true,
        insuranceProvider: 'DAN Europe',
        policyNumber: 'DAN-2024-456',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
        verified: true,
        verifiedDate: '2025-01-05'
      },
      centerSkillLevel: 'advanced',
      notes: 'Frequent diver, comes every month'
    }
    ,
    // Additional mock divers to fill two boats (capacity ~10 each)
    {
      id: 'cust-mock-001',
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@example.com',
      phone: '+34 600 000 001',
      dob: '1992-04-12',
      nationality: 'British',
      customerType: 'tourist',
      preferences: { bcdSize: 'S', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'OW', certificationNumber: 'P-OW-001', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-002',
      firstName: 'Ben',
      lastName: 'Taylor',
      email: 'ben.taylor@example.com',
      phone: '+34 600 000 002',
      dob: '1988-09-30',
      nationality: 'Irish',
      customerType: 'tourist',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'M', tankSize: '12L', ownEquipment: true },
      certifications: [{ agency: 'SSI', level: 'AOW', certificationNumber: 'S-AOW-002', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-003',
      firstName: 'Chloe',
      lastName: 'Martin',
      email: 'chloe.martin@example.com',
      phone: '+33 600 000 003',
      dob: '1995-01-08',
      nationality: 'French',
      customerType: 'tourist',
      preferences: { bcdSize: 'XS', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', tankSize: '10L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'OW', certificationNumber: 'P-OW-003', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-004',
      firstName: 'David',
      lastName: 'Lee',
      email: 'david.lee@example.com',
      phone: '+49 600 000 004',
      dob: '1980-12-22',
      nationality: 'German',
      customerType: 'tourist',
      preferences: { bcdSize: 'L', finsSize: 'L', bootsSize: 'L', wetsuitSize: 'L', tankSize: '15L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'AOW', certificationNumber: 'P-AOW-004', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-005',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@example.com',
      phone: '+44 600 000 005',
      dob: '1998-03-17',
      nationality: 'British',
      customerType: 'tourist',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'M', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'SSI', level: 'OW', certificationNumber: 'S-OW-005', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-006',
      firstName: 'Fabio',
      lastName: 'Rossi',
      email: 'fabio.rossi@example.com',
      phone: '+39 600 000 006',
      dob: '1986-07-11',
      nationality: 'Italian',
      customerType: 'tourist',
      preferences: { bcdSize: 'XL', finsSize: 'XL', bootsSize: 'XL', wetsuitSize: 'XL', tankSize: '15L', ownEquipment: true },
      certifications: [{ agency: 'PADI', level: 'RESCUE', certificationNumber: 'P-RES-006', verified: true }],
      centerSkillLevel: 'advanced'
    },
    {
      id: 'cust-mock-007',
      firstName: 'Giulia',
      lastName: 'Bianchi',
      email: 'giulia.bianchi@example.com',
      phone: '+39 600 000 007',
      dob: '1991-10-05',
      nationality: 'Italian',
      customerType: 'tourist',
      preferences: { bcdSize: 'S', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'CMAS', level: '1*', certificationNumber: 'C-1-007', verified: false }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-008',
      firstName: 'Hugo',
      lastName: 'Leroy',
      email: 'hugo.leroy@example.com',
      phone: '+33 600 000 008',
      dob: '1993-06-25',
      nationality: 'French',
      customerType: 'tourist',
      preferences: { bcdSize: 'M', finsSize: 'L', bootsSize: 'L', wetsuitSize: 'M', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'SSI', level: 'AOW', certificationNumber: 'S-AOW-008', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-009',
      firstName: 'Isabel',
      lastName: 'Lopez',
      email: 'isabel.lopez@example.com',
      phone: '+34 600 000 009',
      dob: '1994-02-02',
      nationality: 'Spanish',
      customerType: 'local',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'M', tankSize: '12L', ownEquipment: true },
      certifications: [{ agency: 'PADI', level: 'OW', certificationNumber: 'P-OW-009', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-010',
      firstName: 'Javier',
      lastName: 'Navarro',
      email: 'javier.navarro@example.com',
      phone: '+34 600 000 010',
      dob: '1987-11-18',
      nationality: 'Spanish',
      customerType: 'local',
      preferences: { bcdSize: 'L', finsSize: 'L', bootsSize: 'L', wetsuitSize: 'L', tankSize: '15L', ownEquipment: false },
      certifications: [{ agency: 'SSI', level: 'OW', certificationNumber: 'S-OW-010', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-011',
      firstName: 'Katarina',
      lastName: 'Novak',
      email: 'katarina.novak@example.com',
      phone: '+421 600 000 011',
      dob: '1990-05-28',
      nationality: 'Slovak',
      customerType: 'tourist',
      preferences: { bcdSize: 'S', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'S', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'AOW', certificationNumber: 'P-AOW-011', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-012',
      firstName: 'Liam',
      lastName: 'Murphy',
      email: 'liam.murphy@example.com',
      phone: '+353 600 000 012',
      dob: '1985-08-09',
      nationality: 'Irish',
      customerType: 'tourist',
      preferences: { bcdSize: 'XL', finsSize: 'XL', bootsSize: 'XL', wetsuitSize: 'XL', tankSize: '15L', ownEquipment: true },
      certifications: [{ agency: 'PADI', level: 'RESCUE', certificationNumber: 'P-RES-012', verified: true }],
      centerSkillLevel: 'advanced'
    },
    {
      id: 'cust-mock-013',
      firstName: 'Marta',
      lastName: 'Silva',
      email: 'marta.silva@example.com',
      phone: '+351 600 000 013',
      dob: '1996-09-14',
      nationality: 'Portuguese',
      customerType: 'tourist',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'M', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'SSI', level: 'OW', certificationNumber: 'S-OW-013', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-014',
      firstName: 'Noah',
      lastName: 'Schmidt',
      email: 'noah.schmidt@example.com',
      phone: '+49 600 000 014',
      dob: '1991-01-21',
      nationality: 'German',
      customerType: 'tourist',
      preferences: { bcdSize: 'L', finsSize: 'L', bootsSize: 'L', wetsuitSize: 'L', tankSize: '15L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'AOW', certificationNumber: 'P-AOW-014', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-015',
      firstName: 'Olivia',
      lastName: 'Hernandez',
      email: 'olivia.hernandez@example.com',
      phone: '+34 600 000 015',
      dob: '1997-12-03',
      nationality: 'Spanish',
      customerType: 'tourist',
      preferences: { bcdSize: 'S', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', ownEquipment: true },
      certifications: [{ agency: 'SSI', level: 'OW', certificationNumber: 'S-OW-015', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-016',
      firstName: 'Pedro',
      lastName: 'Gonzalez',
      email: 'pedro.gonzalez@example.com',
      phone: '+34 600 000 016',
      dob: '1989-04-04',
      nationality: 'Spanish',
      customerType: 'recurrent',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: '5mm', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'AOW', certificationNumber: 'P-AOW-016', verified: true }],
      centerSkillLevel: 'intermediate'
    },
    {
      id: 'cust-mock-017',
      firstName: 'Quentin',
      lastName: 'Dupont',
      email: 'quentin.dupont@example.com',
      phone: '+33 600 000 017',
      dob: '1984-06-06',
      nationality: 'French',
      customerType: 'tourist',
      preferences: { bcdSize: 'XL', finsSize: 'XL', bootsSize: 'XL', wetsuitSize: 'XL', ownEquipment: false },
      certifications: [{ agency: 'CMAS', level: '2*', certificationNumber: 'C-2-017', verified: true }],
      centerSkillLevel: 'advanced'
    },
    {
      id: 'cust-mock-018',
      firstName: 'Rita',
      lastName: 'Costa',
      email: 'rita.costa@example.com',
      phone: '+351 600 000 018',
      dob: '1993-09-19',
      nationality: 'Portuguese',
      customerType: 'tourist',
      preferences: { bcdSize: 'XS', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', tankSize: '10L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'OW', certificationNumber: 'P-OW-018', verified: true }],
      centerSkillLevel: 'beginner'
    },
    {
      id: 'cust-mock-019',
      firstName: 'Sam',
      lastName: 'Anderson',
      email: 'sam.anderson@example.com',
      phone: '+44 600 000 019',
      dob: '1983-02-14',
      nationality: 'British',
      customerType: 'tourist',
      preferences: { bcdSize: 'M', finsSize: 'M', bootsSize: 'M', wetsuitSize: 'M', tankSize: '12L', ownEquipment: true },
      certifications: [{ agency: 'SSI', level: 'AOW', certificationNumber: 'S-AOW-019', verified: true }],
      centerSkillLevel: 'advanced'
    },
    {
      id: 'cust-mock-020',
      firstName: 'Tara',
      lastName: 'Singh',
      email: 'tara.singh@example.com',
      phone: '+91 600 000 020',
      dob: '1999-11-27',
      nationality: 'Indian',
      customerType: 'tourist',
      preferences: { bcdSize: 'S', finsSize: 'S', bootsSize: 'S', wetsuitSize: 'S', tankSize: '12L', ownEquipment: false },
      certifications: [{ agency: 'PADI', level: 'OW', certificationNumber: 'P-OW-020', verified: true }],
      centerSkillLevel: 'beginner'
    }
  ],
  
  equipment: [
    // BCDs (Buoyancy Control Devices)
    {
      id: '550e8400-e29b-41d4-a716-446655440030',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'XS',
      condition: 'excellent',
      serialNumber: 'BCD-XS-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      purchaseDate: '2023-01-15',
      warranty: '2 years',
      lastRevisionDate: '2024-06-01',
      nextRevisionDate: '2025-06-01',
      notes: 'New BCD, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440031',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'BCD-S-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      notes: 'New BCD, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440032',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'BCD-M-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      notes: 'New BCD, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440033',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'L',
      condition: 'good',
      serialNumber: 'BCD-L-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      notes: 'Good condition, minor wear'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440034',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'BCD-XL-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      notes: 'New BCD, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440035',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'BCD Mares Avant Quattro',
      category: 'diving',
      type: 'BCD',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'BCD-XXL-001',
      isAvailable: true,
      brand: 'Mares',
      model: 'Avant Quattro',
      notes: 'New BCD, excellent condition'
    },

    // Regulators
    {
      id: '550e8400-e29b-41d4-a716-446655440040',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator Aqualung Calypso',
      category: 'diving',
      type: 'Regulator',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'REG-001',
      isAvailable: true,
      brand: 'Aqualung',
      model: 'Calypso',
      purchaseDate: '2023-03-20',
      warranty: '3 years',
      lastRevisionDate: '2024-05-15',
      nextRevisionDate: '2025-05-15',
      firstStageBrand: 'Aqualung',
      firstStageModel: 'Calypso',
      secondStageBrand: 'Aqualung',
      secondStageModel: 'Calypso',
      octopusBrand: 'Aqualung',
      octopusModel: 'Calypso',
      notes: 'New regulator, recently serviced'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440041',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator Aqualung Calypso',
      category: 'diving',
      type: 'Regulator',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'REG-002',
      isAvailable: true,
      brand: 'Aqualung',
      model: 'Calypso',
      notes: 'New regulator, recently serviced'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440042',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator Aqualung Calypso',
      category: 'diving',
      type: 'Regulator',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'REG-003',
      isAvailable: true,
      brand: 'Aqualung',
      model: 'Calypso',
      notes: 'Good condition, needs minor maintenance'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440043',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator Aqualung Calypso',
      category: 'diving',
      type: 'Regulator',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'REG-004',
      isAvailable: true,
      brand: 'Aqualung',
      model: 'Calypso',
      notes: 'New regulator, recently serviced'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440044',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Regulator Aqualung Calypso',
      category: 'diving',
      type: 'Regulator',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'REG-005',
      isAvailable: true,
      brand: 'Aqualung',
      model: 'Calypso',
      notes: 'Good condition, needs minor maintenance'
    },

    // Masks
    {
      id: '550e8400-e29b-41d4-a716-446655440050',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask Cressi Big Eyes Evolution',
      category: 'diving',
      type: 'Mask',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'MASK-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Big Eyes Evolution',
      notes: 'New mask, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440051',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask Cressi Big Eyes Evolution',
      category: 'diving',
      type: 'Mask',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'MASK-002',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Big Eyes Evolution',
      notes: 'New mask, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440052',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask Cressi Big Eyes Evolution',
      category: 'diving',
      type: 'Mask',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'MASK-003',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Big Eyes Evolution',
      notes: 'Good condition, minor scratches'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440053',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask Cressi Big Eyes Evolution',
      category: 'diving',
      type: 'Mask',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'MASK-004',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Big Eyes Evolution',
      notes: 'New mask, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440054',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mask Cressi Big Eyes Evolution',
      category: 'diving',
      type: 'Mask',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'MASK-005',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Big Eyes Evolution',
      notes: 'Good condition, minor scratches'
    },

    // Fins
    {
      id: '550e8400-e29b-41d4-a716-446655440060',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'XS',
      condition: 'excellent',
      serialNumber: 'FINS-XS-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'New fins, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440061',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'FINS-S-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'New fins, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440062',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'FINS-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'New fins, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440063',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'L',
      condition: 'good',
      serialNumber: 'FINS-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'Good condition, minor wear'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440064',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'FINS-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'New fins, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440065',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fins Cressi Pro Light',
      category: 'diving',
      type: 'Fins',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'FINS-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Pro Light',
      notes: 'New fins, excellent condition'
    },

    // Wetsuits - Shorty 3mm
    {
      id: '550e8400-e29b-41d4-a716-446655440070',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XS',
      condition: 'excellent',
      serialNumber: 'WS-SHORTY-3MM-XS-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'New shorty wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440071',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'WS-SHORTY-3MM-S-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'New shorty wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440072',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'M',
      condition: 'good',
      serialNumber: 'WS-SHORTY-3MM-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'Good condition, minor repairs needed'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440073',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'L',
      condition: 'excellent',
      serialNumber: 'WS-SHORTY-3MM-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'New shorty wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440074',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'WS-SHORTY-3MM-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'New shorty wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440075',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Shorty 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'WS-SHORTY-3MM-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Shorty 3mm',
      thickness: '3mm',
      style: 'Shorty',
      hood: 'No',
      notes: 'New shorty wetsuit, excellent condition'
    },

    // Wetsuits - Full 3mm
    {
      id: '550e8400-e29b-41d4-a716-446655440080',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XS',
      condition: 'excellent',
      serialNumber: 'WS-FULL-3MM-XS-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440081',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'WS-FULL-3MM-S-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440082',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'WS-FULL-3MM-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440083',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'L',
      condition: 'good',
      serialNumber: 'WS-FULL-3MM-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'Good condition, minor repairs needed'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440084',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'WS-FULL-3MM-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440085',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 3mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'WS-FULL-3MM-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 3mm',
      thickness: '3mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },

    // Wetsuits - Full 5mm
    {
      id: '550e8400-e29b-41d4-a716-446655440090',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-S-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm',
      thickness: '5mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440091',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm',
      thickness: '5mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440092',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'L',
      condition: 'good',
      serialNumber: 'WS-FULL-5MM-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm',
      thickness: '5mm',
      style: 'Full',
      hood: 'No',
      notes: 'Good condition, minor repairs needed'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440093',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm',
      thickness: '5mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440094',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm',
      thickness: '5mm',
      style: 'Full',
      hood: 'No',
      notes: 'New full wetsuit, excellent condition'
    },

    // Wetsuits - Full 5mm with Hood
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm with Hood Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-HOOD-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm with Hood',
      thickness: '5mm',
      style: 'Full',
      hood: 'Yes',
      notes: 'New full wetsuit with hood, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm with Hood Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'L',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-HOOD-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm with Hood',
      thickness: '5mm',
      style: 'Full',
      hood: 'Yes',
      notes: 'New full wetsuit with hood, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm with Hood Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XL',
      condition: 'good',
      serialNumber: 'WS-FULL-5MM-HOOD-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm with Hood',
      thickness: '5mm',
      style: 'Full',
      hood: 'Yes',
      notes: 'Good condition, minor repairs needed'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440103',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wetsuit Full 5mm with Hood Cressi',
      category: 'diving',
      type: 'Wetsuit',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'WS-FULL-5MM-HOOD-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Full 5mm with Hood',
      thickness: '5mm',
      style: 'Full',
      hood: 'Yes',
      notes: 'New full wetsuit with hood, excellent condition'
    },

    // Semi-Dry Suits
    {
      id: '550e8400-e29b-41d4-a716-446655440110',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Semi-Dry Suit 7mm Cressi',
      category: 'diving',
      type: 'Semi-Dry',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'SDS-7MM-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Semi-Dry 7mm',
      thickness: '7mm',
      style: 'Semi-Dry',
      hood: 'Yes',
      notes: 'New semi-dry suit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440111',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Semi-Dry Suit 7mm Cressi',
      category: 'diving',
      type: 'Semi-Dry',
      size: 'L',
      condition: 'excellent',
      serialNumber: 'SDS-7MM-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Semi-Dry 7mm',
      thickness: '7mm',
      style: 'Semi-Dry',
      hood: 'Yes',
      notes: 'New semi-dry suit, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440112',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Semi-Dry Suit 7mm Cressi',
      category: 'diving',
      type: 'Semi-Dry',
      size: 'XL',
      condition: 'good',
      serialNumber: 'SDS-7MM-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Semi-Dry 7mm',
      thickness: '7mm',
      style: 'Semi-Dry',
      hood: 'Yes',
      notes: 'Good condition, minor repairs needed'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440113',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Semi-Dry Suit 7mm Cressi',
      category: 'diving',
      type: 'Semi-Dry',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'SDS-7MM-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Semi-Dry 7mm',
      thickness: '7mm',
      style: 'Semi-Dry',
      hood: 'Yes',
      notes: 'New semi-dry suit, excellent condition'
    },

    // Boots
    {
      id: '550e8400-e29b-41d4-a716-446655440120',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'XS',
      condition: 'excellent',
      serialNumber: 'BOOTS-XS-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'New boots, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440121',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'S',
      condition: 'excellent',
      serialNumber: 'BOOTS-S-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'New boots, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440122',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'M',
      condition: 'excellent',
      serialNumber: 'BOOTS-M-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'New boots, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440123',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'L',
      condition: 'good',
      serialNumber: 'BOOTS-L-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'Good condition, minor wear'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440124',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'XL',
      condition: 'excellent',
      serialNumber: 'BOOTS-XL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'New boots, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440125',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Boots Cressi',
      category: 'diving',
      type: 'Boots',
      size: 'XXL',
      condition: 'excellent',
      serialNumber: 'BOOTS-XXL-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Standard Boots',
      notes: 'New boots, excellent condition'
    },

    // Dive Computers
    {
      id: '550e8400-e29b-41d4-a716-446655440130',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Computer Suunto Zoop',
      category: 'diving',
      type: 'Computer',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'COMP-001',
      isAvailable: true,
      brand: 'Suunto',
      model: 'Zoop',
      notes: 'New dive computer, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440131',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Computer Suunto Zoop',
      category: 'diving',
      type: 'Computer',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'COMP-002',
      isAvailable: true,
      brand: 'Suunto',
      model: 'Zoop',
      notes: 'New dive computer, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440132',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Computer Suunto Zoop',
      category: 'diving',
      type: 'Computer',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'COMP-003',
      isAvailable: true,
      brand: 'Suunto',
      model: 'Zoop',
      notes: 'Good condition, needs battery replacement'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440133',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Computer Suunto Zoop',
      category: 'diving',
      type: 'Computer',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'COMP-004',
      isAvailable: true,
      brand: 'Suunto',
      model: 'Zoop',
      notes: 'New dive computer, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440134',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Computer Suunto Zoop',
      category: 'diving',
      type: 'Computer',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'COMP-005',
      isAvailable: true,
      brand: 'Suunto',
      model: 'Zoop',
      notes: 'New dive computer, excellent condition'
    },

    // Dive Torches
    {
      id: '550e8400-e29b-41d4-a716-446655440140',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'TORCH-001',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'New dive torch, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440141',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'TORCH-002',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'New dive torch, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440142',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'good',
      serialNumber: 'TORCH-003',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'Good condition, needs battery replacement'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440143',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'TORCH-004',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'New dive torch, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440144',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'TORCH-005',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'New dive torch, excellent condition'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440145',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dive Torch Cressi Focus',
      category: 'diving',
      type: 'Torch',
      size: 'Standard',
      condition: 'excellent',
      serialNumber: 'TORCH-006',
      isAvailable: true,
      brand: 'Cressi',
      model: 'Focus',
      notes: 'New dive torch, excellent condition'
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
    },
    // Las Playitas - No boats (shore dives only)
  ],
  
  diveSites: [
    // Castillo Reef Sites
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Anfiteatro',
      type: 'diving',
      depthRange: { min: 12, max: 21 },
      difficultyLevel: 'beginner',
      current: 'little-medium',
      waves: 'unprotected',
      travelTime: '5-10 min',
      description: 'Among the overhanging rocks along the whole reef are scorpion fish, grouperfish, trumpet fish and greater silver smelt. At a depth of about 12 meters, barracudas are waiting for their prey, while curious amber jacks eye the divers closely from nearby.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Barranco',
      type: 'diving',
      depthRange: { min: 12, max: 23 },
      difficultyLevel: 'beginner',
      current: 'little-medium',
      waves: 'unprotected',
      travelTime: '5-10 min',
      description: 'A beautiful reef with overhangs and columns. Swarms of striped breams, zebra breams and yellow-finned mackerel are also found here. In the columns and holes different moray species have made their homes; Tiger morays, Duke Augustus morays and large masked morays are not a rarity here.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fortaleza',
      type: 'diving',
      depthRange: { min: 3, max: 24 },
      difficultyLevel: 'beginner',
      current: 'little-medium',
      waves: 'unprotected',
      travelTime: '3-8 min',
      description: 'A rocky wall, which rises vertically up from the sloping sea floor between 18 and 12 meters deep, to 3 meters below the surface. Around this dive site you will find a lot of wreck debris, which is testimony to the fact that these reefs have proved to be a disaster for many ships.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440008',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mole (cementerio de barco)',
      type: 'diving',
      depthRange: { min: 7, max: 7 },
      difficultyLevel: 'beginner',
      current: 'very little',
      waves: 'protected',
      travelTime: '2 min',
      description: 'Here you are in the kindergarten of the Atlantic. In addition to swarms of young barracudas, striped bream and sardines there are always octopus and squid on site, sometimes you can also find the odd seahorse. In the winter months angel sharks make the spot their own.'
    },
    
    // Salinas Reef Sites
    {
      id: '550e8400-e29b-41d4-a716-446655440009',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'La Emboscada',
      type: 'diving',
      depthRange: { min: 7, max: 40 },
      difficultyLevel: 'beginner',
      current: 'moderate-strong (drift)',
      waves: 'unprotected',
      travelTime: '15-20 min',
      description: 'This dive site above the reef is very close to the coast. The beautiful underwater landscape with impressive rock formations, the possibilities to swim through them and the great depth differences make every dive here very variable.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Camino de altura',
      type: 'diving',
      depthRange: { min: 7, max: 40 },
      difficultyLevel: 'beginner',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '15-20 min',
      description: 'Here you will find some very nice swim throughs outside the reef. Close to the big wall there are a few cool overhangs, in which groupers feel comfortable. Larger fish such as tuna, bonito, yellowtail mackerel are also common in this area.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Muellito',
      type: 'diving',
      depthRange: { min: 7, max: 40 },
      difficultyLevel: 'beginner',
      current: 'moderate-strong',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'The reef begins here at a depth of 7 meters and thus offers the escaping sardines protection from hunting amber jacks and blue perch. At a depth of 23 meters there is a wildly rugged gorge that can be dived to a length of about 12 meters.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Tazar',
      type: 'diving',
      depthRange: { min: 12, max: 35 },
      difficultyLevel: 'beginner',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'Huge swarms of monkfish are often found here on the reef\'s edge. A little further into the deep blue depths swarms of large barracudas can be found circling. A bit deeper between the rock formations you can find, for example, grouper, parrotfish, sea bass and yard eels.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Tesoro negro',
      type: 'diving',
      depthRange: { min: 12, max: 30 },
      difficultyLevel: 'advanced',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'Dark and mysterious. The name of the dive site is fitting: bizarre black corals grow on the reef walls. The wall is home to very beautiful sponges, anemones and nudibranches. At the foot of the wall under the overhangs you can see fields of peacock feathers and cylinder roses.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Portal',
      type: 'diving',
      depthRange: { min: 12, max: 35 },
      difficultyLevel: 'advanced',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'The rocky wall with a swim through leading out into the deep blue depths is a little bit in front of the reef itself. Here one has the best views to see big fish: from tuna fish with a length of 2 meters to swarms of big amber jacks which are up to 1.80 meters long and up to the whale sharks with their cute spots.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440015',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Mirador',
      type: 'diving',
      depthRange: { min: 12, max: 38 },
      difficultyLevel: 'advanced',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'We must first cross a ravine here in order to arrive at a somewhat advanced rock formation. Here, with the view into the deep blue, swarms of bonitos and amber jacks pass by. Between the rocks the eagle ray rests and floats in search of food.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440016',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Laberinto',
      type: 'diving',
      depthRange: { min: 12, max: 38 },
      difficultyLevel: 'advanced',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'The name says it all: the labyrinth is a wild underwater landscape, which is still surprising after many dives. Barracuda, bonito, angel sharks and can be seen here. At the edge of the reef there are usually huge swarms of sardines, which are hunted and chased by tuna.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440017',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'La Pirámide',
      type: 'diving',
      depthRange: { min: 14, max: 39 },
      difficultyLevel: 'advanced',
      current: 'moderate-strong',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'A fight between teenagers is not a rarity here: Behind the reef\'s edge at a depth of about 26 meters, a whole band of half-grown groupers is waiting between the rocks to tussle with free swimming morays. Close to the pyramid you sometimes meet sea turtles who are in search of food.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440018',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'El Monasterio',
      type: 'diving',
      depthRange: { min: 14, max: 36 },
      difficultyLevel: 'advanced',
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10-15 min',
      description: 'A whole labyrinth of rocky gorges awaits you behind the reef\'s edge. They remind us of the narrow walls of a monastery. Between the rocks you can find stately octopuses and large sepias. In front of the rocky passages on the bright sandy bottom, various rays search for food.'
    },
    
    // Nuevo Horizonte Reef Sites
    {
      id: '550e8400-e29b-41d4-a716-446655440019',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Nuevo Horizonte',
      type: 'diving',
      depthRange: { min: 24, max: 39 },
      difficultyLevel: 'advanced',
      current: 'moderate-strong (drift)',
      waves: 'unprotected',
      travelTime: '15-20 min',
      description: 'Nuevo Horizonte, vor Costa Caleta (Caleta de la Camella). Large fish such as tuna, bonito, amber jacks and barracudas are regularly sighted here. Doradas, Badis, Barracudas and Tuna come curiously towards the reef. In February and March, a lot of angel sharks come here to mate.'
    },
    // Las Playitas dive sites
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      name: 'Playa de Las Playitas',
      locationId: '550e8400-e29b-41d4-a716-446655440002', // Las Playitas
      type: 'beach',
      difficulty: 'beginner',
      depth: '3-8m',
      current: 'low',
      waves: 'low',
      travelTime: '0 min',
      description: 'Direct beach entry from Las Playitas. Perfect for beginners and training dives. Shallow waters with sandy bottom and scattered rocks. Great for night dives and underwater photography.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      name: 'Cueva de Las Playitas',
      locationId: '550e8400-e29b-41d4-a716-446655440002', // Las Playitas
      type: 'cave',
      difficulty: 'advanced',
      depth: '12-18m',
      current: 'medium',
      waves: 'medium',
      travelTime: '5-10 min',
      description: 'Underwater cave system with multiple entrances. Advanced divers only. Rich marine life including groupers, moray eels, and occasional rays. Excellent visibility year-round.'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      name: 'Arrecife de Las Playitas',
      locationId: '550e8400-e29b-41d4-a716-446655440002', // Las Playitas
      type: 'reef',
      difficulty: 'intermediate',
      depth: '8-15m',
      current: 'low',
      waves: 'low',
      travelTime: '10-15 min',
      description: 'Natural reef formation with abundant coral and marine life. Perfect for intermediate divers. Common sightings include parrotfish, angelfish, and various species of wrasse.'
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
      isActive: true,
      pricing: {
        // Caleta de Fuste specific pricing
        customerTypes: {
          tourist: {
            name: "Tourist",
            description: "Visiting divers with volume discounts",
            pricing: "tiered",
            orientationDive: 32.00,
            diveTiers: [
              { dives: 1, price: 46.00, description: "1-2 dives" },
              { dives: 3, price: 44.00, description: "3-5 dives" },
              { dives: 6, price: 42.00, description: "6-8 dives" },
              { dives: 9, price: 40.00, description: "9-12 dives" },
              { dives: 13, price: 38.00, description: "13+ dives" }
            ]
          },
          local: {
            name: "Local",
            description: "Local residents with fixed pricing",
            pricing: "fixed",
            pricePerDive: 35.00
          },
          recurrent: {
            name: "Recurrent",
            description: "Regular customers with fixed pricing",
            pricing: "fixed",
            pricePerDive: 32.00
          }
        },
        equipment: {
          completeEquipment: 13.00,     // Complete equipment rental
          Suit: 5.00,                   // Wetsuit rental
          BCD: 5.00,                    // BCD rental
          Regulator: 5.00,              // Regulator rental
          Torch: 5.00,                  // Torch rental
          Computer: 3.00,               // Dive computer rental
          UWCamera: 20.00,              // Underwater camera rental
          mask: 0.00,                   // Free (included in dive price)
          fins: 0.00,                   // Free (included in dive price)
          boots: 0.00                   // Free (included in dive price)
        },
        addons: {
          night_dive: 20.00,            // Night dive surcharge
          personal_instructor: 100.00   // Personal instructor
        },
        diveInsurance: {
          one_day: 7.00,               // 1 day insurance
          one_week: 18.00,             // 1 week insurance
          one_month: 25.00,            // 1 month insurance
          one_year: 45.00              // 1 year insurance
        },
        beverages: {
          water: 1.80,                 // Water
          soft_drinks: 1.80,           // Soft drinks
          beer: 1.80,                  // Beer
          coffee: 1.80,                // Coffee
          tea: 1.80                    // Tea
        },
        other: {
          clothes: 0.00,               // Variable price
          souvenirs: 0.00,             // Variable price
          photos: 0.00,                // Variable price
          tips: 0.00                   // Variable price
        },
        tax: {
          igic_rate: 0.07,             // 7% IGIC rate (Canary Islands)
          igic_label: "IGIC (7%)"      // IGIC label
        }
      }
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Las Playitas',
      type: 'diving',
      address: {
        street: 'Playa de Las Playitas',
        city: 'Las Playitas',
        postalCode: '35610',
        country: 'Spain'
      },
      isActive: true,
      pricing: {
        // Las Playitas specific pricing
        customerTypes: {
          tourist: {
            name: "Tourist",
            description: "Visiting divers with volume discounts",
            pricing: "tiered",
            // Playitas Dive
            orientationDive: 35.00,
            diveTiers: [
              // Caleta Dive from Playitas
              { dives: 1, price: 45.00, description: "1-2 dives" },
              { dives: 3, price: 43.00, description: "3-5 dives" },
              { dives: 6, price: 41.00, description: "6-8 dives" },
              { dives: 9, price: 39.00, description: "9-12 dives" },
              { dives: 13, price: 37.00, description: "13+ dives" }
            ]
          },
          local: {
            name: "Local",
            description: "Local residents with fixed pricing",
            pricing: "fixed",
            pricePerDive: 33.00        // Slightly cheaper than Caleta
          },
          recurrent: {
            name: "Recurrent",
            description: "Regular customers with fixed pricing",
            pricing: "fixed",
            pricePerDive: 30.00        // Slightly cheaper than Caleta
          }
        },
        equipment: {
          completeEquipment: 12.00,    // Slightly cheaper than Caleta
          Suit: 4.50,                  // Slightly cheaper
          BCD: 4.50,                   // Slightly cheaper
          Regulator: 4.50,             // Slightly cheaper
          Torch: 4.50,                 // Slightly cheaper
          Computer: 2.50,              // Slightly cheaper
          UWCamera: 18.00,             // Slightly cheaper
          mask: 0.00,                  // Free (included in dive price)
          fins: 0.00,                  // Free (included in dive price)
          boots: 0.00                  // Free (included in dive price)
        },
        addons: {
          night_dive: 18.00,           // Slightly cheaper than Caleta
          personal_instructor: 90.00,  // Slightly cheaper than Caleta
          // Other activities specific to Las Playitas
          dive_trip_gran_tarajal_lajita: 45.00,
          transfer_to_caleta: 15.00
        },
        diveInsurance: {
          one_day: 7.00,               // Same as Caleta
          one_week: 18.00,             // Same as Caleta
          one_month: 25.00,            // Same as Caleta
          one_year: 45.00              // Same as Caleta
        },
        beverages: {
          water: 1.80,                 // Same as Caleta
          soft_drinks: 1.80,           // Same as Caleta
          beer: 1.80,                  // Same as Caleta
          coffee: 1.80,                // Same as Caleta
          tea: 1.80                    // Same as Caleta
        },
        other: {
          clothes: 0.00,               // Variable price
          souvenirs: 0.00,             // Variable price
          photos: 0.00,                // Variable price
          tips: 0.00                   // Variable price
        },
        tax: {
          igic_rate: 0.07,             // Same as Caleta
          igic_label: "IGIC (7%)"      // Same as Caleta
        }
      }
    }
  ],
  
  pricingConfig: [
    {
      customerType: 'tourist',
      orientationDive: 32.00,
      tiers: [
        { dives: 1, price: 46.00 },
        { dives: 3, price: 44.00 },
        { dives: 6, price: 42.00 },
        { dives: 9, price: 40.00 },
        { dives: 13, price: 38.00 }
      ],
      addons: {
        nightDive: 20.00,
        personalInstructor: 100.00
      },
      diveInsurance: {
        one_day: 7.00,
        one_week: 18.00,
        one_month: 25.00,
        one_year: 45.00
      }
    },
    {
      customerType: 'local',
      pricePerDive: 35.00,
      addons: {
        nightDive: 20.00,
        personalInstructor: 100.00
      },
      diveInsurance: {
        one_day: 7.00,
        one_week: 18.00,
        one_month: 25.00,
        one_year: 45.00
      }
    },
    {
      customerType: 'recurrent',
      pricePerDive: 32.00,
      addons: {
        nightDive: 20.00,
        personalInstructor: 100.00
      },
      diveInsurance: {
        one_day: 7.00,
        one_week: 18.00,
        one_month: 25.00,
        one_year: 45.00
      }
    }
  ],
  
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
  ],
  
  settings: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      certificationUrls: {
        SSI: 'https://www.divessi.com/en/verify-certification',
        PADI: 'https://www.padi.com/verify',
        CMAS: 'https://www.cmas.org/certification-verification',
        VDST: 'https://www.vdst.de/zertifikatspruefung'
      },
      prices: {
        // Customer type specific pricing
        customerTypes: {
          tourist: {
            name: "Tourist",
            description: "Visiting divers with volume discounts",
            pricing: "tiered", // Uses volume discounts
            orientationDive: 32.00, // Special price for orientation dive
            diveTiers: [
              { dives: 1, price: 46.00, description: "1-2 dives" },
              { dives: 3, price: 44.00, description: "3-5 dives" },
              { dives: 6, price: 42.00, description: "6-8 dives" },
              { dives: 9, price: 40.00, description: "9-12 dives" },
              { dives: 13, price: 38.00, description: "13+ dives" }
            ]
          },
          local: {
            name: "Local",
            description: "Local residents with fixed pricing",
            pricing: "fixed", // Fixed price per dive
            pricePerDive: 35.00
          },
          recurrent: {
            name: "Recurrent",
            description: "Regular customers with fixed pricing",
            pricing: "fixed", // Fixed price per dive
            pricePerDive: 32.00
          }
        },
        
        // Equipment rental prices
        equipment: {
          complete_equipment: 13.00,  // Full equipment set (first 8 dives only)
          suit: 5.00,                 // Wetsuit
          bcd: 5.00,                  // Buoyancy Control Device
          regulator: 5.00,            // Regulator
          torch: 5.00,                // Underwater torch
          computer: 3.00,             // Dive computer
          uw_camera: 20.00,           // Underwater camera
          mask: 0.00,                 // Free (included in dive price)
          fins: 0.00,                 // Free (included in dive price)
          boots: 0.00                 // Free (included in dive price)
        },
        
        // Addon services
        addons: {
          night_dive: 20.00,          // Night dive surcharge
          personal_instructor: 100.00 // Personal instructor
        },
        
        // Dive insurance (mandatory)
        diveInsurance: {
          one_day: 7.00,      // 1 day insurance
          one_week: 18.00,    // 1 week insurance
          one_month: 25.00,   // 1 month insurance
          one_year: 45.00     // 1 year insurance
        },
        
        // Beverages
        beverages: {
          water: 1.80,                // Water
          soft_drinks: 1.80,          // Soft drinks
          beer: 1.80,                 // Beer
          coffee: 1.80,               // Coffee
          tea: 1.80                   // Tea
        },
        
        // Other services (variable pricing)
        other: {
          clothes: 0.00,              // Variable price
          souvenirs: 0.00,            // Variable price
          photos: 0.00,               // Variable price
          tips: 0.00                  // Variable price
        },
        
        // Tax settings (Canary Islands use IGIC instead of IVA)
        tax: {
          igic_rate: 0.07,             // 7% IGIC rate (Canary Islands)
          igic_label: "IGIC (7%)"      // IGIC label
        }
      }
    }
  ],

  users: [
    // Admin Team (Owners Family) - Full access to everything
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      username: 'admin',
      name: 'Administrator',
      email: 'admin@deep-blue-diving.com',
      role: 'admin',
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
      // No locationAccess = global access to all locations
    },
    
    // Owner - Equipment & Boat Maintenance (both locations)
    {
      id: '550e8400-e29b-41d4-a716-446655440200',
      username: 'owner',
      name: 'Owner',
      email: 'owner@deep-blue-diving.com',
      role: 'boat_pilot',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    
    // Site Managers - All rights on their site except maintenance and account creation
    // Caleta Manager (has boat rights)
    {
      id: '550e8400-e29b-41d4-a716-446655440300',
      username: 'caleta_manager',
      name: 'Caleta Manager',
      email: 'caleta.manager@deep-blue-diving.com',
      role: 'admin',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001'], // Caleta de Fuste only
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    // Las Playitas Manager (no boat rights - no boats there)
    {
      id: '550e8400-e29b-41d4-a716-446655440301',
      username: 'playitas_manager',
      name: 'Las Playitas Manager',
      email: 'playitas.manager@deep-blue-diving.com',
      role: 'admin',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440002'], // Las Playitas only
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    
    // Boat Captains (Caleta only - 2 accounts)
    {
      id: '550e8400-e29b-41d4-a716-446655440400',
      username: 'captain1',
      name: 'Boat Captain 1',
      email: 'captain1@deep-blue-diving.com',
      role: 'boat_pilot',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001'], // Caleta de Fuste only
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440401',
      username: 'captain2',
      name: 'Boat Captain 2',
      email: 'captain2@deep-blue-diving.com',
      role: 'boat_pilot',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001'], // Caleta de Fuste only
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    
    // Guides (access to both sites - 4 accounts)
    {
      id: '550e8400-e29b-41d4-a716-446655440500',
      username: 'guide1',
      name: 'Guide 1',
      email: 'guide1@deep-blue-diving.com',
      role: 'guide',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440501',
      username: 'guide2',
      name: 'Guide 2',
      email: 'guide2@deep-blue-diving.com',
      role: 'guide',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440502',
      username: 'guide3',
      name: 'Guide 3',
      email: 'guide3@deep-blue-diving.com',
      role: 'guide',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440503',
      username: 'guide4',
      name: 'Guide 4',
      email: 'guide4@deep-blue-diving.com',
      role: 'guide',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    
    // Trainees (access to both sites - 2 accounts)
    {
      id: '550e8400-e29b-41d4-a716-446655440600',
      username: 'trainee1',
      name: 'Trainee 1',
      email: 'trainee1@deep-blue-diving.com',
      role: 'intern',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440601',
      username: 'trainee2',
      name: 'Trainee 2',
      email: 'trainee2@deep-blue-diving.com',
      role: 'intern',
      locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], // Both locations
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z'
    }
  ]
};

// Initialize localStorage with mock data if not already initialized
export const initializeMockData = () => {
  // Clear existing data to force re-initialization with correct structure
  const keys = ['dcms_bookings', 'dcms_customers', 'dcms_equipment', 'dcms_boats', 'dcms_diveSites', 'dcms_locations', 'dcms_pricingConfig', 'dcms_governmentBonos', 'dcms_settings', 'dcms_users', 'dcms_boatPreps'];
  keys.forEach(key => localStorage.removeItem(key));
  
  // Initialize with correct data structure
  localStorage.setItem('dcms_bookings', JSON.stringify(initialMockData.bookings));
  localStorage.setItem('dcms_customers', JSON.stringify(initialMockData.customers));
  localStorage.setItem('dcms_equipment', JSON.stringify(initialMockData.equipment));
  localStorage.setItem('dcms_boats', JSON.stringify(initialMockData.boats));
  localStorage.setItem('dcms_diveSites', JSON.stringify(initialMockData.diveSites));
  localStorage.setItem('dcms_locations', JSON.stringify(initialMockData.locations));
  localStorage.setItem('dcms_pricingConfig', JSON.stringify(initialMockData.pricingConfig));
  localStorage.setItem('dcms_governmentBonos', JSON.stringify(initialMockData.governmentBonos));
  localStorage.setItem('dcms_settings', JSON.stringify(initialMockData.settings));
  localStorage.setItem('dcms_users', JSON.stringify(initialMockData.users));
  localStorage.setItem('dcms_boatPreps', JSON.stringify([]));
};

export default initialMockData;

