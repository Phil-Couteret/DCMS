/**
 * Script to reactivate the Bike Rental location
 * Run with: node backend/scripts/reactivate-bike-rental.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reactivateBikeRental() {
  try {
    // Find all locations including inactive ones
    const allLocations = await prisma.locations.findMany({
      orderBy: { name: 'asc' },
    });

    console.log('All locations:');
    allLocations.forEach(loc => {
      console.log(`- ${loc.name} (${loc.type}) - Active: ${loc.is_active}`);
    });

    // Find Bike Rental location
    const bikeRentalLocation = allLocations.find(
      loc => loc.type === 'bike_rental'
    );

    if (!bikeRentalLocation) {
      console.log('\n❌ No Bike Rental location found!');
      return;
    }

    console.log(`\n📍 Found Bike Rental location: ${bikeRentalLocation.name} (ID: ${bikeRentalLocation.id})`);
    console.log(`   Current status: ${bikeRentalLocation.is_active ? 'Active' : 'Inactive'}`);

    if (bikeRentalLocation.is_active) {
      console.log('\n✅ Bike Rental location is already active!');
      return;
    }

    // Reactivate it
    const updated = await prisma.locations.update({
      where: { id: bikeRentalLocation.id },
      data: { is_active: true },
    });

    console.log(`\n✅ Successfully reactivated Bike Rental location: ${updated.name}`);
    console.log(`   Location is now active and will appear in the location selector.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateBikeRental();
