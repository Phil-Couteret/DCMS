#!/usr/bin/env node

/**
 * Migration script to migrate consent data from localStorage to PostgreSQL database
 * 
 * Usage:
 *   node scripts/migrate-consents-to-db.js
 * 
 * This script:
 * 1. Reads consent data from localStorage JSON export
 * 2. Maps customer IDs (email-based) to database UUIDs
 * 3. Inserts consent records into PostgreSQL database
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function migrateConsents() {
  console.log('🔄 Consent Data Migration Tool\n');
  console.log('This script migrates consent data from localStorage to PostgreSQL database.\n');

  // Get localStorage data path
  const dataPath = await question('Enter path to localStorage consent data JSON file (or press Enter to skip): ');
  
  if (!dataPath || dataPath.trim() === '') {
    console.log('⚠️  No file path provided. Skipping migration.');
    console.log('\nTo export localStorage data:');
    console.log('1. Open browser DevTools Console');
    console.log('2. Run: JSON.stringify(JSON.parse(localStorage.getItem("dcms_consents") || "{}"))');
    console.log('3. Copy the output and save to a JSON file');
    console.log('4. Run this script again with the file path\n');
    rl.close();
    await prisma.$disconnect();
    return;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.resolve(dataPath.trim());
    console.log(`\n📂 Reading consent data from: ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const localStorageConsents = JSON.parse(fileContent);
    
    console.log(`✅ Found consent data for ${Object.keys(localStorageConsents).length} customers\n`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [customerId, consents] of Object.entries(localStorageConsents)) {
      if (!Array.isArray(consents) || consents.length === 0) {
        continue;
      }

      try {
        // Find customer in database by ID (try direct match first, then by email)
        let customer = await prisma.customers.findUnique({
          where: { id: customerId },
        });

        // If not found by ID, try to find by email (if customerId is actually an email)
        if (!customer && customerId.includes('@')) {
          customer = await prisma.customers.findFirst({
            where: { email: customerId },
          });
        }

        if (!customer) {
          console.log(`⚠️  Customer not found: ${customerId} - skipping ${consents.length} consents`);
          errorCount++;
          errors.push(`Customer ${customerId} not found`);
          continue;
        }

        // Migrate each consent
        for (const consent of consents) {
          try {
            // Map consent type (handle both 'medical_data' and 'medical_clearance')
            let consentType = consent.consentType;
            if (consentType === 'medical_data') {
              consentType = 'medical_clearance'; // Use database enum value
            }

            await prisma.customer_consents.create({
              data: {
                customer_id: customer.id,
                consent_type: consentType,
                consent_given: consent.consentGiven !== false, // Default to true if not specified
                consent_date: consent.consentDate ? new Date(consent.consentDate) : new Date(),
                consent_method: consent.consentMethod || 'online',
                ip_address: consent.ipAddress || null,
                user_agent: consent.userAgent || null,
                withdrawal_date: consent.withdrawalDate ? new Date(consent.withdrawalDate) : null,
                is_active: consent.isActive !== false, // Default to true
              },
            });

            migratedCount++;
          } catch (consentError) {
            console.error(`❌ Error migrating consent for ${customerId}:`, consentError.message);
            errorCount++;
            errors.push(`Consent error for ${customerId}: ${consentError.message}`);
          }
        }

        console.log(`✅ Migrated ${consents.length} consents for customer: ${customer.email || customerId}`);
      } catch (error) {
        console.error(`❌ Error processing customer ${customerId}:`, error.message);
        errorCount++;
        errors.push(`Customer ${customerId}: ${error.message}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} consent records`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    console.log('\n✅ Migration complete!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run migration
migrateConsents().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

