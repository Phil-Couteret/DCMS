import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Caleta de Fuste location ID
const CALETA_LOCATION_ID = '550e8400-e29b-41d4-a716-446655440001';

// Parse depth range from string like "12-21 m" to {min: 12, max: 21}
function parseDepthRange(depthStr: string): { min: number; max: number } {
  const match = depthStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  // Single depth like "7 m"
  const singleMatch = depthStr.match(/(\d+)/);
  if (singleMatch) {
    const depth = parseInt(singleMatch[1]);
    return { min: depth, max: depth };
  }
  return { min: 0, max: 0 };
}

// Map difficulty from website format to database format
function mapDifficulty(difficulty: string): string {
  const lower = difficulty.toLowerCase();
  if (lower.includes('beginner')) return 'beginner';
  if (lower.includes('intermediate')) return 'intermediate';
  if (lower.includes('advanced')) return 'advanced';
  if (lower.includes('beginner') && lower.includes('intermediate')) return 'beginner';
  return 'beginner'; // default
}

// Dive sites data from https://deep-blue-diving.com
const diveSites = [
  // Castillo Reef sites
  {
    name: 'Anfiteatro',
    depthRange: parseDepthRange('12-21 m'),
    difficultyLevel: mapDifficulty('beginners - intermediate'),
    conditions: {
      current: 'little - medium',
      waves: 'unprotected',
      travelTime: '5 - 10 min',
      description: 'Among the overhanging rocks along the whole reef are scorpion fish, grouperfish, trumpet fish and greater silver smelt. At a depth of about 12 meters, barracudas are waiting for their prey, while curious amber jacks eye the divers closely from nearby.',
      reef: 'Castillo Reef'
    }
  },
  {
    name: 'Barranco',
    depthRange: parseDepthRange('12-23 m'),
    difficultyLevel: mapDifficulty('beginners - intermediate'),
    conditions: {
      current: 'little - medium',
      waves: 'unprotected',
      travelTime: '5 - 10 min',
      description: 'A beautiful reef with overhangs and columns. Swarms of striped breams, zebra breams and yellow-finned mackerel are also found here. In the columns and holes different moray species have made their homes; Tiger morays, Duke Augustus morays and large masked morays are not a rarity here. A little farther away from the reef on the sandy sea floor you can find stingers rays, eagle rays and angel sharks.',
      reef: 'Castillo Reef'
    }
  },
  {
    name: 'Fortaleza',
    depthRange: parseDepthRange('3-24 m'),
    difficultyLevel: mapDifficulty('beginners - intermediate'),
    conditions: {
      current: 'little - medium',
      waves: 'unprotected',
      travelTime: '3 - 8 min',
      description: 'A rocky wall, which rises vertically up from the sloping sea floor between 18 and 12 meters deep, to 3 meters below the surface. Around this dive site you will find a lot of wreck debris, which is testimony to the fact that these reefs have proved to be a disaster for many ships.',
      reef: 'Castillo Reef'
    }
  },
  {
    name: 'Mole (cementerio de barco)',
    depthRange: parseDepthRange('7 m'),
    difficultyLevel: mapDifficulty('beginners - intermediate'),
    conditions: {
      current: 'very little',
      waves: 'protected',
      travelTime: '2 min',
      description: 'Here you are in the kindergarten of the Atlantic. In addition to swarms of young barracudas, striped bream and sardines there are always octopus and squid on site, sometimes you can also find the odd seahorse. In the winter months angel sharks make the spot their own.',
      reef: 'Castillo Reef'
    }
  },
  
  // Salinas Reef sites
  {
    name: 'La Emboscada',
    depthRange: parseDepthRange('7-40 m'),
    difficultyLevel: mapDifficulty('beginner - advanced'),
    conditions: {
      current: 'moderate - strong (drift)',
      waves: 'unprotected',
      travelTime: '15 - 20 min',
      description: 'This dive site above the reef is very close to the coast. The beautiful underwater landscape with impressive rock formations, the possibilities to swim through them and the great depth differences make every dive here very variable. Close to the reef, you can observe large sardine swarms hunted by yellowtail mackerels. Further out in the sandy area we meet sting rays and eagle rays.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'Camino de altura',
    depthRange: parseDepthRange('7-40 m'),
    difficultyLevel: mapDifficulty('beginner - advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '15 - 20 min',
      description: 'Here you will find some very nice swim throughs outside the reef. Close to the big wall there are a few cool overhangs, in which groupers feel comfortable. Larger fish such as tuna, bonito, yellowtail mackerel are also common in this area. In the sand, you are likely to discover rays or angel sharks.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Muellito',
    depthRange: parseDepthRange('7-40 m'),
    difficultyLevel: mapDifficulty('beginner - advanced'),
    conditions: {
      current: 'moderate - strong',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'The reef begins here at a depth of 7 meters and thus offers the escaping sardines protection from hunting amber jacks and blue perch. At a depth of 23 meters there is a wildly rugged gorge that can be dived to a length of about 12 meters. The reef drops steeply at this point very quickly. Ideal hunting grounds for barracudas and tuna fish!',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Tazar',
    depthRange: parseDepthRange('12-35 m'),
    difficultyLevel: mapDifficulty('beginner - advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'Huge swarms of monkfish are often found here on the reef\'s edge. A little further into the deep blue depths swarms of large barracudas can be found circling. A bit deeper between the rock formations you can find, for example, grouper, parrotfish, sea bass and yard eels.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'Tesoro negro',
    depthRange: parseDepthRange('12-30 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'Dark and mysterious. The name of the dive site is fitting: bizarre black corals grow on the reef walls. The wall is home to very beautiful sponges, anemones and nudibranches. At the foot of the wall under the overhangs you can see fields of peacock feathers and cylinder roses. On the sandy bottom in front of the reef, you will find sting rays.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Portal',
    depthRange: parseDepthRange('12-35 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'The rocky wall with a swim through leading out into the deep blue depths is a little bit in front of the reef itself. Here one has the best views to see big fish: from tuna fish with a length of 2 meters to swarms of big amber jacks which are up to 1.80 meters long and up to the whale sharks with their cute spots, the biggest fish in the area.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Mirador',
    depthRange: parseDepthRange('12-38 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'We must first cross a ravine here in order to arrive at a somewhat advanced rock formation. Here, with the view into the deep blue, swarms of bonitos and amber jacks pass by. Between the rocks the eagle ray rests and floats in search of food. Amongst the columns morays and conger eels can be found hiding.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Laberinto',
    depthRange: parseDepthRange('12-38 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'The name says it all: the labyrinth is a wild underwater landscape, which is still surprising after many dives. Barracuda, bonito, angel sharks and can be seen here. At the edge of the reef there are usually huge swarms of sardines, which are hunted and chased by tuna.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'La Pirámide',
    depthRange: parseDepthRange('14-39 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate - strong',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'A fight between teenagers is not a rarity here: Behind the reef\'s edge at a depth of about 26 meters, a whole band of half-grown groupers is waiting between the rocks to tussle with free swimming morays. Close to the pyramid you sometimes meet sea turtles who are in search of food. Further out on the sandy sea floor the chances are good to see one of the big sting rays with a 2 meter span.',
      reef: 'Salinas Reef'
    }
  },
  {
    name: 'El Monasterio',
    depthRange: parseDepthRange('14-36 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate',
      waves: 'unprotected',
      travelTime: '10 - 15 min',
      description: 'A whole labyrinth of rocky gorges awaits you behind the reef\'s edge. They remind us of the narrow walls of a monastery. Between the rocks you can find stately octopuses and large sepias. In front of the rocky passages on the bright sandy bottom, various rays search for food. Quite often, amber jacks and barracudas also spend time here. On the walls there are lots of small animals, corals and anemones to discover.',
      reef: 'Salinas Reef'
    }
  },
  
  // Nuevo Horizonte Reef sites (based on the web content)
  {
    name: 'Nuevo Horizonte Reef',
    depthRange: parseDepthRange('24-39 m'),
    difficultyLevel: mapDifficulty('advanced'),
    conditions: {
      current: 'moderate - strong (drift)',
      waves: 'unprotected',
      travelTime: '15 - 20 min',
      description: 'Nuevo Horizonte, vor Costa Caleta (Caleta de la Camella). This reef is the end of a deep-sea ditch that ascends here on the coast. Large fish like doradas, badis, barracudas and tuna come curiously towards the reef. In February and March, a lot of angel sharks come here to mate.',
      reef: 'Nuevo Horizonte Reef'
    }
  }
];

async function main() {
  console.log('🌊 Seeding dive sites for Caleta de Fuste...\n');

  // Check if location exists
  const location = await prisma.locations.findUnique({
    where: { id: CALETA_LOCATION_ID }
  });

  if (!location) {
    console.error(`❌ Location with ID ${CALETA_LOCATION_ID} not found!`);
    console.error('Please make sure the Caleta de Fuste location exists in the database.');
    process.exit(1);
  }

  console.log(`✓ Found location: ${location.name}\n`);

  // Clean up old sites with reef prefix in name (they should be grouped by reef field now)
  console.log('🧹 Cleaning up old dive sites with reef prefix in name...\n');
  const oldSites = await prisma.dive_sites.findMany({
    where: {
      location_id: CALETA_LOCATION_ID,
      name: {
        contains: ' - '
      }
    }
  });

  let deleted = 0;
  for (const oldSite of oldSites) {
    // Check if there's a newer version without the prefix
    const siteNameWithoutPrefix = oldSite.name.split(' - ').slice(1).join(' - ');
    const newSite = await prisma.dive_sites.findFirst({
      where: {
        location_id: CALETA_LOCATION_ID,
        name: siteNameWithoutPrefix
      }
    });

    // Only delete if a newer version exists
    if (newSite) {
      await prisma.dive_sites.delete({
        where: { id: oldSite.id }
      });
      console.log(`🗑️  Deleted old: ${oldSite.name}`);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`\n✓ Cleaned up ${deleted} old dive site(s)\n`);
  } else {
    console.log('✓ No old dive sites to clean up\n');
  }

  // Clean up duplicate Mole entries - keep "Mole (cementerio de barco)", remove plain "Mole"
  console.log('🧹 Cleaning up duplicate Mole entries...\n');
  const moleSites = await prisma.dive_sites.findMany({
    where: {
      location_id: CALETA_LOCATION_ID,
      OR: [
        { name: 'Mole' },
        { name: 'Mole (cementerio de barco)' }
      ]
    }
  });

  const moleWithSuffix = moleSites.find(s => s.name === 'Mole (cementerio de barco)');
  const plainMole = moleSites.find(s => s.name === 'Mole');

  if (plainMole && moleWithSuffix) {
    // Delete the plain "Mole" entry
    await prisma.dive_sites.delete({
      where: { id: plainMole.id }
    });
    console.log(`🗑️  Deleted duplicate: ${plainMole.name} (keeping "${moleWithSuffix.name}")`);
    deleted++;
  }

  if (deleted > 0) {
    console.log(`\n✓ Cleaned up ${deleted} duplicate dive site(s)\n`);
  } else {
    console.log('✓ No duplicate dive sites to clean up\n');
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const site of diveSites) {
    try {
      // Check if dive site already exists by name (new format without reef prefix)
      let existing = await prisma.dive_sites.findFirst({
        where: {
          name: site.name,
          location_id: CALETA_LOCATION_ID
        }
      });

      // If not found, check for old format with reef prefix
      if (!existing && site.conditions.reef) {
        const oldName = `${site.conditions.reef} - ${site.name}`;
        existing = await prisma.dive_sites.findFirst({
          where: {
            name: oldName,
            location_id: CALETA_LOCATION_ID
          }
        });
      }

      const siteData = {
        location_id: CALETA_LOCATION_ID,
        name: site.name,
        type: 'diving' as const,
        depth_range: site.depthRange,
        difficulty_level: site.difficultyLevel,
        conditions: site.conditions,
        is_active: true
      };

      if (existing) {
        // Update existing site (including renaming if it had old format)
        await prisma.dive_sites.update({
          where: { id: existing.id },
          data: siteData
        });
        console.log(`✓ Updated: ${existing.name} → ${site.name}`);
        updated++;
      } else {
        // Create new site
        await prisma.dive_sites.create({
          data: siteData
        });
        console.log(`✓ Created: ${site.name}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${site.name}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${skipped}`);
  console.log(`   Total: ${diveSites.length}`);
  console.log('\n✅ Dive sites seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding dive sites:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

