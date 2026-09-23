import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding settings...');

  // Check if default settings already exists
  const existingSettings = await prisma.settings.findUnique({
    where: { key: 'default' },
  });

  if (!existingSettings) {
    const defaultSettings = {
      key: 'default',
      value: {
        organisation: {
          name: 'Deep Blue Diving',
          legalName: 'Deep Blue Diving',
          address: 'Muelle Deportivo / Calle Teneriffe, E - 35610 Caleta de Fuste - Fuerteventura',
          phone: '+34 928 163 712 / +34 606 275 468',
          email: 'info@deep-blue-diving.com',
        },
        locationTypes: [], // Start from scratch; configure via Settings > Location Types
        certificationUrls: {
          SSI: 'https://www.divessi.com/en/verify-certification',
          PADI: 'https://www.padi.com/verify',
          CMAS: 'https://www.cmas.org/certification-verification',
          VDST: 'https://www.vdst.de/zertifikatspruefung'
        },
        prices: {
          equipment: {
            complete_equipment: 13.00,
            suit: 5.00,
            bcd: 5.00,
            regulator: 5.00,
            torch: 5.00,
            computer: 3.00,
            uw_camera: 20.00,
            mask: 0.00,
            fins: 0.00,
            boots: 0.00
          },
          addons: {
            night_dive: 20.00,
            personal_instructor: 100.00
          },
          diveInsurance: {
            one_day: 7.00,
            one_week: 18.00,
            one_month: 25.00,
            one_year: 45.00
          },
          beverages: {
            water: 1.80,
            soft_drinks: 1.80,
            beer: 1.80,
            coffee: 1.80,
            tea: 1.80
          },
          tax: {
            igic_rate: 0.07,
            igic_label: "IGIC (7%)"
          }
        }
      },
      description: 'Default system settings'
    };

    await prisma.settings.create({
      data: defaultSettings,
    });
    console.log('✅ Default settings created');
  } else {
    console.log('ℹ️  Default settings already exist');
    const val = existingSettings.value as Record<string, unknown>;
    if (!val?.organisation) {
      const organisation = {
        name: 'Deep Blue Diving',
        legalName: 'Deep Blue Diving',
        address: 'Muelle Deportivo / Calle Teneriffe, E - 35610 Caleta de Fuste - Fuerteventura',
        phone: '+34 928 163 712 / +34 606 275 468',
        email: 'info@deep-blue-diving.com',
      };
      await prisma.settings.update({
        where: { key: 'default' },
        data: { value: { ...val, organisation } },
      });
      console.log('✅ Organisation backfilled into existing settings');
    }
  }

  console.log('✅ Settings seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

