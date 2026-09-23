import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/languageContext';
import { useAuth, USER_ROLES } from '../utils/authContext';
import dataService from '../services/dataService';
import tankService from '../services/tankService';
import { parseISO, isBefore, addMonths, addDays } from 'date-fns';

/**
 * Phase 6.5 extraction (same shared-hook + presentational-tabs pattern as
 * BoatPrep/Financial in Phase 5.2): all state/effects/handlers for the
 * Equipment page, which has two tabs (Equipment/rental inventory, and
 * Tanks/Cylinders) sharing tightly-coupled state (both driven off the same
 * location/permission checks, both able to trigger each other's reload).
 */
export default function useEquipmentData() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const currentLocationId = localStorage.getItem('dcms_current_location');

  // Determine if user is Global admin (no locationAccess or empty array)
  const isGlobalAdmin = !currentUser?.locationAccess || (Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length === 0);

  // Determine if user can manage equipment (create/edit/delete)
  // Owners (BOAT_PILOT, TRAINER) and Global Admins can manage equipment
  // Guides and Interns can only view and toggle availability
  const canManageEquipment = isGlobalAdmin ||
    currentUser?.role === USER_ROLES.BOAT_PILOT ||
    currentUser?.role === USER_ROLES.TRAINER;

  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0); // 0 = Equipment/Bike Rental, 1 = Tanks (when not bike rental)
  const [tanks, setTanks] = useState([]);
  const [tankDialogOpen, setTankDialogOpen] = useState(false);
  const [tankBulkDialogOpen, setTankBulkDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState(null);
  const [tankFilter, setTankFilter] = useState('all'); // all, overdue, dueSoon, ok
  const [tankSizeFilter, setTankSizeFilter] = useState('all'); // all, 6, 7, 10, 12, 15
  const [tankOrderBy, setTankOrderBy] = useState('number'); // Column to sort by
  const [tankOrder, setTankOrder] = useState('asc'); // 'asc' or 'desc'

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: '',
    size: '',
    serialNumber: '',
    condition: 'excellent',
    locationId: isGlobalAdmin ? '' : currentLocationId,
    isAvailable: true,
    notes: '',
    brand: '',
    model: '',
    thickness: '',
    style: '',
    hood: '',
    purchaseDate: '',
    warranty: '',
    lastRevisionDate: '',
    nextRevisionDate: '',
    firstStageBrand: '',
    firstStageModel: '',
    secondStageBrand: '',
    secondStageModel: '',
    octopusBrand: '',
    octopusModel: ''
  });

  const [tankFormData, setTankFormData] = useState({
    size: '',
    number: '',
    lastVisualTest: '',
    nextVisualTest: '',
    lastHydrostaticTest: '',
    nextHydrostaticTest: '',
    serialNumber: '',
    netColour: '',
    remarks: '',
    locationId: isGlobalAdmin ? '' : currentLocationId
  });

  useEffect(() => {
    loadEquipment();
    loadLocations();
    loadCurrentLocation();
    loadTanks();
  }, [currentLocationId, isGlobalAdmin]);

  const loadTanks = async () => {
    try {
      const allEquipment = await dataService.getAll('equipment') || [];
      // Filter for tanks - check if category is 'Tank' (type will be 'diving' for tanks)
      const tankEquipment = allEquipment.filter(eq => {
        const category = (eq.category || '').toLowerCase();
        const name = (eq.name || '').toLowerCase();
        return category === 'tank' || name.includes('tank') || name.includes('cylinder');
      });

      // Filter by location if not global admin
      const filteredTanks = isGlobalAdmin
        ? tankEquipment
        : tankEquipment.filter(t => (t.locationId || t.location_id) === currentLocationId);

      // Enrich tanks with metadata from tankService
      const enrichedTanks = filteredTanks.map(tank => tankService.enrichTankWithMetadata(tank));

      setTanks(Array.isArray(enrichedTanks) ? enrichedTanks : []);
    } catch (error) {
      console.error('Error loading tanks:', error);
      setTanks([]);
    }
  };

  const loadCurrentLocation = async () => {
    try {
      if (currentLocationId) {
        const allLocations = await dataService.getAll('locations') || [];
        let loc = allLocations.find(l => l.id === currentLocationId);
        if (loc) {
          // Process pricing - map settings.pricing to pricing (like Prices component does)
          if (loc.settings?.pricing && !loc.pricing) {
            loc = { ...loc, pricing: loc.settings.pricing };
          }
          setCurrentLocation(loc);
        }
      }
    } catch (error) {
      console.error('Error loading current location:', error);
    }
  };

  const loadEquipment = async () => {
    try {
      const allEquipment = await dataService.getAll('equipment') || [];

      // Filter out tanks - they are managed separately in the Tanks tab
      const nonTankEquipment = allEquipment.filter(eq => {
        const category = (eq.category || '').toLowerCase();
        const name = (eq.name || '').toLowerCase();
        // Exclude tanks - same logic as loadTanks but inverted
        return !(category === 'tank' || name.includes('tank') || name.includes('cylinder'));
      });

      // For site managers, only show equipment for their location
      const filteredEquipment = isGlobalAdmin
        ? nonTankEquipment
        : nonTankEquipment.filter(eq => (eq.locationId || eq.location_id) === currentLocationId);
      setEquipment(Array.isArray(filteredEquipment) ? filteredEquipment : []);
    } catch (error) {
      console.error('Error loading equipment:', error);
      setEquipment([]);
    }
  };

  const loadLocations = async () => {
    try {
      if (isGlobalAdmin) {
        const allLocations = await dataService.getAll('locations') || [];
        setLocations(Array.isArray(allLocations) ? allLocations : []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  // Check location type for equipment display
  const isBikeRental = currentLocation?.type === 'bike_rental';
  const isSurfRental = currentLocation?.type === 'surf';
  const isKiteSurfRental = currentLocation?.type === 'kite_surf';

  // Get surf rental equipment from location pricing (Point Break style)
  const getSurfRentalEquipment = () => {
    if (!isSurfRental || !currentLocation) return [];
    const pricing = currentLocation.pricing || currentLocation.settings?.pricing || {};
    const surfTypes = pricing.surfTypes || {};
    const surfEquipment = pricing.surfEquipment || {};
    const items = [];
    Object.entries(surfTypes).forEach(([key, st]) => {
      items.push({
        id: `surf-type-${key}`,
        name: st.name || key.replace(/_/g, ' '),
        category: 'surf_type',
        type: 'surf_type',
        description: st.description || '',
        locationId: currentLocationId,
        isAvailable: true,
        surfTypeKey: key
      });
    });
    Object.entries(surfEquipment).forEach(([key, price]) => {
      const labels = { wetsuit: 'Wetsuit', shoes: 'Shoes', surf_leash: 'Surf Leash', auto_rack: 'Auto Rack' };
      items.push({
        id: `surf-equipment-${key}`,
        name: labels[key] || key,
        category: 'surf_accessory',
        type: 'surf_accessory',
        description: `€${Number(price).toFixed(2)}/day`,
        price,
        locationId: currentLocationId,
        isAvailable: true,
        equipmentKey: key
      });
    });
    return items;
  };

  const getKiteSurfRentalEquipment = () => {
    if (!isKiteSurfRental || !currentLocation) return [];
    const pricing = currentLocation.pricing || currentLocation.settings?.pricing || {};
    const kiteTypes = pricing.kiteTypes || {};
    const kiteEquipment = pricing.kiteEquipment || {};
    const items = [];
    Object.entries(kiteTypes).forEach(([key, kt]) => {
      items.push({
        id: `kite-type-${key}`,
        name: kt.name || key.replace(/_/g, ' '),
        category: 'kite_type',
        type: 'kite_type',
        description: kt.description || '',
        locationId: currentLocationId,
        isAvailable: true,
        kiteTypeKey: key
      });
    });
    const labels = { harness: 'Harness', kite_leash: 'Kite Leash', helmet: 'Helmet', impact_vest: 'Impact Vest', wetsuit: 'Wetsuit' };
    Object.entries(kiteEquipment).forEach(([key, price]) => {
      items.push({
        id: `kite-equipment-${key}`,
        name: labels[key] || key,
        category: 'kite_accessory',
        type: 'kite_accessory',
        description: `€${Number(price).toFixed(2)}/day`,
        price,
        locationId: currentLocationId,
        isAvailable: true,
        equipmentKey: key
      });
    });
    return items;
  };

  // Get bike rental equipment from location pricing
  const getBikeRentalEquipment = () => {
    if (!isBikeRental || !currentLocation) return [];

    const pricing = currentLocation.pricing || currentLocation.settings?.pricing || {};
    const bikeTypes = pricing.bikeTypes || {};
    const rentalEquipment = pricing.equipment || {};

    const items = [];

    // Add bike types
    Object.entries(bikeTypes).forEach(([key, bikeType]) => {
      items.push({
        id: `bike-type-${key}`,
        name: bikeType.name || key,
        category: 'bike_type',
        type: 'bike_type',
        description: bikeType.description || '',
        locationId: currentLocationId,
        isAvailable: true,
        isBikeType: true,
        bikeTypeKey: key
      });
    });

    // Add rental equipment
    Object.entries(rentalEquipment).forEach(([key, price]) => {
      const equipmentNames = {
        click_pedals: 'Click Pedals',
        helmet: 'Helmet',
        gps_computer: 'GPS Computer'
      };
      items.push({
        id: `rental-equipment-${key}`,
        name: equipmentNames[key] || key,
        category: 'rental_equipment',
        type: 'rental_equipment',
        description: `Rental equipment - Charged once per rental`,
        price: price,
        locationId: currentLocationId,
        isAvailable: true,
        isRentalEquipment: true,
        equipmentKey: key
      });
    });

    return items;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleAddEquipment = () => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to add equipment', severity: 'error' });
      return;
    }
    setFormData({
      name: '',
      category: isBikeRental ? 'bike_equipment' : 'diving',
      type: isBikeRental ? 'bike_accessory' : '',
      size: '',
      serialNumber: '',
      condition: 'excellent',
      locationId: isGlobalAdmin ? '' : currentLocationId,
      isAvailable: true,
      notes: '',
      brand: '',
      model: '',
      thickness: '',
      style: '',
      hood: '',
      purchaseDate: '',
      warranty: '',
      lastRevisionDate: '',
      nextRevisionDate: '',
      firstStageBrand: '',
      firstStageModel: '',
      secondStageBrand: '',
      secondStageModel: '',
      octopusBrand: '',
      octopusModel: ''
    });
    setEditingEquipment(null);
    setAddDialogOpen(true);
  };

  const handleEditEquipment = (item) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to edit equipment', severity: 'error' });
      return;
    }
    setFormData(item);
    setEditingEquipment(item);
    setAddDialogOpen(true);
  };

  const handleToggleAvailability = async (item) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    await dataService.update('equipment', item.id, updated);
    setSnackbar({
      open: true,
      message: `Equipment marked as ${!item.isAvailable ? 'available' : 'unavailable'}`,
      severity: 'success'
    });
    loadEquipment();
  };

  const handleSaveEquipment = async () => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to save equipment', severity: 'error' });
      return;
    }

    if (!formData.name || !formData.category || !formData.type) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    if (!isGlobalAdmin && formData.locationId !== currentLocationId) {
      setSnackbar({ open: true, message: 'You can only modify equipment for your location', severity: 'error' });
      return;
    }

    try {
      if (editingEquipment) {
        await dataService.update('equipment', editingEquipment.id, formData);
        setSnackbar({ open: true, message: 'Equipment updated successfully', severity: 'success' });
      } else {
        await dataService.create('equipment', formData);
        setSnackbar({ open: true, message: 'Equipment added successfully', severity: 'success' });
      }

      loadEquipment();
      loadTanks(); // Also reload tanks in case a tank was edited as equipment
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      setSnackbar({ open: true, message: 'Error saving equipment', severity: 'error' });
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to delete equipment', severity: 'error' });
      return;
    }
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await dataService.remove('equipment', id);
        setSnackbar({ open: true, message: 'Equipment deleted successfully', severity: 'success' });
        loadEquipment();
      } catch (error) {
        console.error('Error deleting equipment:', error);
        setSnackbar({ open: true, message: 'Error deleting equipment', severity: 'error' });
      }
    }
  };

  const getRevisionStatus = (nextRevisionDate) => {
    if (!nextRevisionDate) return null;
    const nextDate = parseISO(nextRevisionDate);
    const now = new Date();
    if (isBefore(nextDate, now)) return 'overdue';
    if (isBefore(nextDate, addMonths(now, 3))) return 'dueSoon';
    return 'ok';
  };

  // Tank-specific functions
  const getTestStatus = (nextTestDate) => {
    if (!nextTestDate) return null;
    try {
      const nextDate = typeof nextTestDate === 'string' ? parseISO(nextTestDate) : new Date(nextTestDate);
      const now = new Date();
      if (isBefore(nextDate, now)) return 'overdue';
      if (isBefore(nextDate, addDays(now, 30))) return 'dueSoon';
      return 'ok';
    } catch (e) {
      return null;
    }
  };

  const handleAddTank = () => {
    const effectiveLocationId = isGlobalAdmin ? '' : (currentLocationId || localStorage.getItem('dcms_current_location'));
    setTankFormData({
      size: '',
      number: '',
      lastVisualTest: '',
      nextVisualTest: '',
      lastHydrostaticTest: '',
      nextHydrostaticTest: '',
      serialNumber: '',
      netColour: '',
      remarks: '',
      locationId: effectiveLocationId || ''
    });
    setEditingTank(null);
    setTankDialogOpen(true);
  };

  const handleEditTank = (tank) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to edit tanks', severity: 'error' });
      return;
    }

    // Get tank metadata from tankService
    const tankMetadata = tankService.getTankMetadata(tank.id);

    // Extract tank-specific data from equipment item or metadata
    const tankData = {
      size: tank.size || '',
      number: tank.number || tank.tankNumber || tankMetadata.number || '',
      lastVisualTest: tank.lastVisualTest || tank.lastVisualTestDate || tankMetadata.lastVisualTest || '',
      nextVisualTest: tank.nextVisualTest || tank.nextVisualTestDate || tankMetadata.nextVisualTest || '',
      lastHydrostaticTest: tank.lastHydrostaticTest || tank.lastHydrostaticTestDate || tankMetadata.lastHydrostaticTest || '',
      nextHydrostaticTest: tank.nextHydrostaticTest || tank.nextHydrostaticTestDate || tankMetadata.nextHydrostaticTest || '',
      serialNumber: tank.serialNumber || tank.serial_number || '',
      netColour: tank.netColour || tankMetadata.netColour || '',
      remarks: tank.remarks || tank.notes || tankMetadata.remarks || '',
      locationId: tank.locationId || tank.location_id || ''
    };
    setTankFormData(tankData);
    setEditingTank(tank);
    setTankDialogOpen(true);
  };

  const handleSaveTank = async () => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to save tanks', severity: 'error' });
      return;
    }

    if (!tankFormData.size || !tankFormData.number || !tankFormData.serialNumber) {
      setSnackbar({ open: true, message: 'Please fill in Size, Number, and Serial Number', severity: 'error' });
      return;
    }

    const effectiveLocationId = tankFormData.locationId || currentLocationId;
    if (!effectiveLocationId) {
      setSnackbar({ open: true, message: 'Location ID is required. Please select a location.', severity: 'error' });
      return;
    }

    if (!isGlobalAdmin && effectiveLocationId !== currentLocationId) {
      setSnackbar({ open: true, message: 'You can only modify tanks for your location', severity: 'error' });
      return;
    }

    try {
      const tankData = {
        name: `Tank ${tankFormData.number} - ${tankFormData.size}L`,
        category: 'diving', // Must be one of enum values: 'diving', 'snorkeling', 'accessory'
        type: 'diving', // Must be one of enum values: 'diving', 'snorkeling', 'accessory'
        size: tankFormData.size,
        serialNumber: tankFormData.serialNumber,
        locationId: effectiveLocationId,
        isAvailable: true,
        condition: 'good' // Regular condition field
      };

      let equipmentId;
      if (editingTank) {
        await dataService.update('equipment', editingTank.id, tankData);
        equipmentId = editingTank.id;
        setSnackbar({ open: true, message: 'Tank updated successfully', severity: 'success' });
      } else {
        const result = await dataService.create('equipment', tankData);
        if (!result || !result.id) {
          throw new Error('Failed to create tank - no result or ID returned');
        }
        equipmentId = result.id;
        setSnackbar({ open: true, message: 'Tank added successfully', severity: 'success' });
      }

      // Store tank-specific metadata separately
      const tankMetadata = {
        number: tankFormData.number,
        netColour: tankFormData.netColour || '',
        lastVisualTest: tankFormData.lastVisualTest || null,
        nextVisualTest: tankFormData.nextVisualTest || null,
        lastHydrostaticTest: tankFormData.lastHydrostaticTest || null,
        nextHydrostaticTest: tankFormData.nextHydrostaticTest || null,
        remarks: tankFormData.remarks || ''
      };
      tankService.saveTankMetadata(equipmentId, tankMetadata);

      await loadTanks();
      setTankDialogOpen(false);
    } catch (error) {
      console.error('Error saving tank:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      setSnackbar({
        open: true,
        message: `Error saving tank: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  const handleBulkImportTanks = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        // Properly handle multi-line quoted CSV values
        // We need to merge lines that are part of a multi-line quoted value
        const rawLines = csv.split(/\r?\n/);
        const mergedLines = [];
        let currentLine = '';
        let inQuotes = false;

        for (let i = 0; i < rawLines.length; i++) {
          const line = rawLines[i];

          if (!currentLine) {
            currentLine = line;
          } else {
            // If we're continuing a multi-line value, add newline; otherwise add as comma-separated
            currentLine += inQuotes ? '\n' + line : line;
          }

          // Track quote state - handle escaped quotes
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
              // Check if it's an escaped quote (double quote)
              if (j + 1 < line.length && line[j + 1] === '"') {
                j++; // Skip the next quote (escaped)
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            }
          }

          // If we're not in quotes after processing this line, the CSV row is complete
          if (!inQuotes && currentLine) {
            mergedLines.push({ line: currentLine.trim(), originalIndex: i });
            currentLine = '';
          }
        }

        // Add any remaining line (in case file ends while still in quotes)
        if (currentLine.trim()) {
          mergedLines.push({ line: currentLine.trim(), originalIndex: rawLines.length - 1 });
        }

        // Filter out empty lines
        const lines = mergedLines.filter(item => item.line);

        // Find the header row (look for "SIZE" and "NUMBER" as separate columns)
        // The CSV has a two-row header: first row has "VISUAL", "HYDROSTATIC", second row has actual column names
        let headerRowIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i].line;
          const lineUpper = lineText.toUpperCase();
          // Check if this line has "SIZE" and "NUMBER" as separate words (not "SERIAL NUMBER")
          // Split by comma and check each column
          const columns = lineText.split(',').map(c => c.trim().toUpperCase());
          const hasSize = columns.some(c => c === 'SIZE');
          // Check for "NUMBER" column (not part of "SERIAL NUMBER")
          // "SERIAL NUMBER" appears as two columns: "SERIAL" and "NUMBER", so we need to check position
          const numberIdx = columns.findIndex(c => c === 'NUMBER');
          const serialIdx = columns.findIndex(c => c.includes('SERIAL'));
          const hasNumber = numberIdx >= 0 && (serialIdx < 0 || Math.abs(numberIdx - serialIdx) > 1);
          // Check if "SERIAL NUMBER" appears (either as one column or two adjacent columns)
          const hasSerialNumber = columns.some(c => c.includes('SERIAL') && c.includes('NUMBER')) ||
                                 (serialIdx >= 0 && numberIdx >= 0 && Math.abs(serialIdx - numberIdx) === 1);

          if (hasSize && hasNumber && hasSerialNumber) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Could not find header row. Please ensure the CSV has a header row with "SIZE", "NUMBER", and "SERIAL NUMBER" columns.');
        }

        const headerLine = lines[headerRowIndex].line;
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

        // Map column indices - handle duplicate column names
        const sizeIdx = headers.findIndex(h => h.includes('size') && !h.includes('serial'));
        const numberIdx = headers.findIndex(h => h.includes('number') && !h.includes('serial'));
        const serialIdx = headers.findIndex(h => h.includes('serial'));
        const netColourIdx = headers.findIndex(h => (h.includes('net') && h.includes('colour')) || h.includes('net colour'));

        // For duplicate "LAST TEST" and "NEXT TEST", find them by position
        // Based on the CSV: SIZE, NUMBER, LAST TEST (VISUAL), NEXT TEST (VISUAL), LAST TEST (HYDROSTATIC), NEXT TEST (HYDROSTATIC), SERIAL NUMBER, NET COLOUR, REMARKS
        let lastVisualIdx = -1;
        let nextVisualIdx = -1;
        let lastHydroIdx = -1;
        let nextHydroIdx = -1;

        // Find indices by checking context (visual comes before hydrostatic, and they're in pairs)
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i];
          if (h.includes('last') && h.includes('test')) {
            if (lastVisualIdx === -1) {
              lastVisualIdx = i; // First "LAST TEST" is visual
            } else {
              lastHydroIdx = i; // Second "LAST TEST" is hydrostatic
            }
          }
          if (h.includes('next') && h.includes('test')) {
            if (nextVisualIdx === -1) {
              nextVisualIdx = i; // First "NEXT TEST" is visual
            } else {
              nextHydroIdx = i; // Second "NEXT TEST" is hydrostatic
            }
          }
        }

        const remarksIdx = headers.findIndex(h => h.includes('remark'));

        if (sizeIdx === -1 || numberIdx === -1 || serialIdx === -1) {
          throw new Error(`Missing required columns. Found: SIZE=${sizeIdx}, NUMBER=${numberIdx}, SERIAL NUMBER=${serialIdx}`);
        }

        const importedTanks = [];
        const skippedTanks = [];

        // Get location ID - for global admins, try to use a selected location or prompt
        let effectiveLocationId = '';
        if (isGlobalAdmin) {
          // For global admins, check if they have a location selected in the form
          effectiveLocationId = tankFormData.locationId || '';
          if (!effectiveLocationId && locations.length > 0) {
            // Use first location as default for global admins if none selected
            effectiveLocationId = locations[0].id;
          }
        } else {
          // For non-global admins, use their assigned location
          const storedLocationId = localStorage.getItem('dcms_current_location');
          effectiveLocationId = currentLocationId || storedLocationId || '';
        }

        if (!effectiveLocationId) {
          if (isGlobalAdmin) {
            throw new Error('Please select a location in the import dialog before importing tanks.');
          } else {
            throw new Error('Location ID is required. Please ensure you have a location assigned.');
          }
        }

        // Parse dates - handle various formats
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          const cleaned = dateStr.trim().replace(/^"|"$/g, '').replace(/\n/g, ' ').trim();
          if (!cleaned || cleaned.toLowerCase() === 'missing' || cleaned === '?' || cleaned === '-' || cleaned === '') return null;

          // Handle month names (Feb, July, Sept, etc.)
          const monthNames = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'july': '07', 'aug': '08', 'sep': '09', 'sept': '09', 'oct': '10', 'nov': '11', 'dec': '12'
          };

          // Try DD/MM/YYYY format first
          if (cleaned.includes('/')) {
            const parts = cleaned.split('/').map(p => p.trim());
            if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              if (year.length === 4) {
                return `${year}-${month}-${day}`;
              }
            }
          }

          // Try YYYY-MM-DD format
          if (cleaned.includes('-') && cleaned.length >= 10) {
            return cleaned.substring(0, 10);
          }

          // Try month name format (e.g., "Feb", "July")
          const monthLower = cleaned.toLowerCase();
          for (const [month, num] of Object.entries(monthNames)) {
            if (monthLower.startsWith(month)) {
              // Return null for month-only dates (no full date available)
              return null;
            }
          }

          return null;
        };

        // Process data rows (start after header row)
        for (let i = headerRowIndex + 1; i < lines.length; i++) {
          const line = lines[i].line;
          const originalRowNum = lines[i].originalIndex + 1;

          if (!line) continue;

          try {
            // Simple CSV parsing - split by comma, but handle quoted values
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim()); // Add last value

            // Clean up values (remove quotes, normalize whitespace, handle newlines)
            const cleanedValues = values.map(v => {
              let cleaned = v.replace(/^"|"$/g, ''); // Remove surrounding quotes
              cleaned = cleaned.replace(/\n/g, ' '); // Replace newlines with spaces
              cleaned = cleaned.replace(/\r/g, ''); // Remove carriage returns
              cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
              return cleaned.trim();
            });

            // Ensure we have enough columns
            while (cleanedValues.length < headers.length) {
              cleanedValues.push('');
            }

            const size = cleanedValues[sizeIdx] || '';
            const number = cleanedValues[numberIdx] || '';
            const serialNumber = cleanedValues[serialIdx] || '';

            if (!size || !number || !serialNumber) {
              const reason = `Missing required fields - Size: "${size}", Number: "${number}", Serial: "${serialNumber}"`;
              skippedTanks.push({ row: originalRowNum, reason, data: { size, number, serialNumber, allValues: cleanedValues } });
              continue;
            }

            const lastVisualTest = lastVisualIdx >= 0 && cleanedValues[lastVisualIdx] ? parseDate(cleanedValues[lastVisualIdx]) : null;
            const nextVisualTest = nextVisualIdx >= 0 && cleanedValues[nextVisualIdx] ? parseDate(cleanedValues[nextVisualIdx]) : null;
            const lastHydrostaticTest = lastHydroIdx >= 0 && cleanedValues[lastHydroIdx] ? parseDate(cleanedValues[lastHydroIdx]) : null;
            const nextHydrostaticTest = nextHydroIdx >= 0 && cleanedValues[nextHydroIdx] ? parseDate(cleanedValues[nextHydroIdx]) : null;
            const netColour = (netColourIdx >= 0 ? (cleanedValues[netColourIdx] || '') : '').trim();
            const remarks = (remarksIdx >= 0 ? (cleanedValues[remarksIdx] || '') : '').trim();

            // Create equipment record
            const equipmentData = {
              name: `Tank ${number} - ${size}L`,
              category: 'diving',
              type: 'diving',
              size: size,
              serialNumber: serialNumber,
              locationId: effectiveLocationId,
              isAvailable: true,
              condition: 'good'
            };

            try {
              const result = await dataService.create('equipment', equipmentData);

              if (result && result.id) {
                // Store tank metadata
                const tankMetadata = {
                  number: number,
                  netColour: netColour,
                  lastVisualTest: lastVisualTest,
                  nextVisualTest: nextVisualTest,
                  lastHydrostaticTest: lastHydrostaticTest,
                  nextHydrostaticTest: nextHydrostaticTest,
                  remarks: remarks
                };
                tankService.saveTankMetadata(result.id, tankMetadata);
                importedTanks.push({ number, size, serialNumber });
              } else {
                skippedTanks.push({ row: originalRowNum, reason: 'Failed to create equipment record - no ID returned', data: { size, number, serialNumber } });
                console.error(`Failed to create tank ${number} (row ${originalRowNum}):`, result);
              }
            } catch (createError) {
              skippedTanks.push({ row: originalRowNum, reason: `Create error: ${createError.message}`, data: { size, number, serialNumber } });
              console.error(`Error creating tank ${number} (row ${originalRowNum}):`, createError);
            }
          } catch (rowError) {
            const originalRowNum = lines[i].originalIndex + 1;
            console.error(`Error processing row ${i + 1} (original ${originalRowNum}):`, rowError);
            skippedTanks.push({ row: originalRowNum, reason: rowError.message || 'Parse error', data: null });
          }
        }

        let message = '';
        if (importedTanks.length > 0) {
          message = `${importedTanks.length} tank(s) imported successfully`;
          if (skippedTanks.length > 0) {
            message += `. ${skippedTanks.length} row(s) skipped.`;
          }
        } else if (skippedTanks.length > 0) {
          message = `No tanks imported. ${skippedTanks.length} row(s) skipped. Check browser console (F12) for details.`;
        } else {
          message = 'No data rows found to import.';
        }

        setSnackbar({
          open: true,
          message: message,
          severity: importedTanks.length > 0 ? 'success' : (skippedTanks.length > 0 ? 'warning' : 'error')
        });
        await loadTanks();
        setTankBulkDialogOpen(false);
      } catch (error) {
        console.error('Error importing tanks:', error);
        setSnackbar({
          open: true,
          message: `Error importing file: ${error.message || 'Please check the format.'}`,
          severity: 'error'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteTank = async (id) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to delete tanks', severity: 'error' });
      return;
    }
    if (window.confirm('Are you sure you want to delete this tank?')) {
      try {
        await dataService.remove('equipment', id);
        // Also delete the tank metadata
        tankService.deleteTankMetadata(id);
        setSnackbar({ open: true, message: 'Tank deleted successfully', severity: 'success' });
        loadTanks();
      } catch (error) {
        console.error('Error deleting tank:', error);
        setSnackbar({ open: true, message: 'Error deleting tank', severity: 'error' });
      }
    }
  };

  // Helper function to extract tank metadata
  const getTankMetadata = (tank) => {
    const metadata = tankService.getTankMetadata(tank.id);
    return {
      number: tank.number || tank.tankNumber || metadata.number,
      nextVisualTest: tank.nextVisualTest || tank.nextVisualTestDate || metadata.nextVisualTest,
      nextHydrostaticTest: tank.nextHydrostaticTest || tank.nextHydrostaticTestDate || metadata.nextHydrostaticTest
    };
  };

  const filteredTanks = tanks.filter(tank => {
    // Filter by size first
    if (tankSizeFilter !== 'all') {
      const tankSize = String(tank.size || '').trim();
      if (tankSize !== tankSizeFilter) {
        return false;
      }
    }

    // Filter by test status
    if (tankFilter === 'all') return true;
    const metadata = getTankMetadata(tank);
    const visualStatus = getTestStatus(metadata.nextVisualTest);
    const hydroStatus = getTestStatus(metadata.nextHydrostaticTest);

    if (tankFilter === 'overdue') {
      return visualStatus === 'overdue' || hydroStatus === 'overdue';
    }
    if (tankFilter === 'dueSoon') {
      return visualStatus === 'dueSoon' || hydroStatus === 'dueSoon';
    }
    return visualStatus === 'ok' && hydroStatus === 'ok';
  });

  // Sorting function for tanks
  const handleTankSort = (property) => {
    const isAsc = tankOrderBy === property && tankOrder === 'asc';
    setTankOrder(isAsc ? 'desc' : 'asc');
    setTankOrderBy(property);
  };

  // Sort filtered tanks
  const sortedTanks = React.useMemo(() => {
    if (!tankOrderBy) return filteredTanks;

    return [...filteredTanks].sort((a, b) => {
      let aValue, bValue;

      // Get values based on sort column
      switch (tankOrderBy) {
        case 'size':
          aValue = parseFloat(a.size) || 0;
          bValue = parseFloat(b.size) || 0;
          break;
        case 'number':
          aValue = parseFloat(a.number || a.tankNumber || '0') || 0;
          bValue = parseFloat(b.number || b.tankNumber || '0') || 0;
          break;
        case 'serialNumber':
          aValue = (a.serialNumber || a.serial_number || '').toLowerCase();
          bValue = (b.serialNumber || b.serial_number || '').toLowerCase();
          break;
        case 'netColour':
          aValue = (a.netColour || '').toLowerCase();
          bValue = (b.netColour || '').toLowerCase();
          break;
        case 'lastVisualTest':
          aValue = a.lastVisualTest ? new Date(a.lastVisualTest) : new Date(0);
          bValue = b.lastVisualTest ? new Date(b.lastVisualTest) : new Date(0);
          break;
        case 'nextVisualTest':
          aValue = a.nextVisualTest ? new Date(a.nextVisualTest) : new Date(0);
          bValue = b.nextVisualTest ? new Date(b.nextVisualTest) : new Date(0);
          break;
        case 'lastHydrostaticTest':
          aValue = a.lastHydrostaticTest ? new Date(a.lastHydrostaticTest) : new Date(0);
          bValue = b.lastHydrostaticTest ? new Date(b.lastHydrostaticTest) : new Date(0);
          break;
        case 'nextHydrostaticTest':
          aValue = a.nextHydrostaticTest ? new Date(a.nextHydrostaticTest) : new Date(0);
          bValue = b.nextHydrostaticTest ? new Date(b.nextHydrostaticTest) : new Date(0);
          break;
        case 'remarks':
          aValue = (a.remarks || a.notes || '').toLowerCase();
          bValue = (b.remarks || b.notes || '').toLowerCase();
          break;
        default:
          return 0;
      }

      // Compare values
      if (aValue < bValue) {
        return tankOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return tankOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredTanks, tankOrderBy, tankOrder]);

  const overdueTanks = tanks.filter(tank => {
    const metadata = getTankMetadata(tank);
    const visualStatus = getTestStatus(metadata.nextVisualTest);
    const hydroStatus = getTestStatus(metadata.nextHydrostaticTest);
    return visualStatus === 'overdue' || hydroStatus === 'overdue';
  }).length;

  const dueSoonTanks = tanks.filter(tank => {
    const metadata = getTankMetadata(tank);
    const visualStatus = getTestStatus(metadata.nextVisualTest);
    const hydroStatus = getTestStatus(metadata.nextHydrostaticTest);
    return (visualStatus === 'dueSoon' || hydroStatus === 'dueSoon') &&
           visualStatus !== 'overdue' && hydroStatus !== 'overdue';
  }).length;

  const handleBulkImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const importedEquipment = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const equipment = {
              name: values[0] || '',
              category: values[1] || 'diving',
              type: values[2] || 'standard',
              size: values[3] || '',
              serialNumber: values[4] || '',
              condition: values[5] || 'excellent',
              locationId: '550e8400-e29b-41d4-a716-446655440001',
              isAvailable: true,
              notes: values[6] || ''
            };
            importedEquipment.push(equipment);
          }
        }

        // Add all imported equipment
        importedEquipment.forEach(eq => {
          dataService.create('equipment', eq);
        });

        setSnackbar({
          open: true,
          message: `${importedEquipment.length} equipment items imported successfully`,
          severity: 'success'
        });
        loadEquipment();
        setBulkDialogOpen(false);
      } catch (error) {
        setSnackbar({ open: true, message: 'Error importing file. Please check the format.', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // Get equipment list - for rental locations show pricing-based equipment; for diving show inventory
  const allEquipmentList = (isBikeRental || isSurfRental || isKiteSurfRental)
    ? (isSurfRental ? getSurfRentalEquipment() : isKiteSurfRental ? getKiteSurfRentalEquipment() : getBikeRentalEquipment())
    : equipment;

  const filteredEquipment = allEquipmentList.filter(eq => {
    const matchesSearch = searchQuery.trim() === '' ||
      eq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || eq.type === filterType || eq.category === filterType;

    return matchesSearch && matchesType;
  });

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'success',
      good: 'info',
      fair: 'warning',
      poor: 'error'
    };
    return colors[condition] || 'default';
  };

  const availableCount = allEquipmentList.filter(eq => eq.isAvailable).length;
  const totalCount = allEquipmentList.length;

  const overdueCount = allEquipmentList.filter(eq => getRevisionStatus(eq.nextRevisionDate) === 'overdue').length;
  const dueSoonCount = allEquipmentList.filter(eq => getRevisionStatus(eq.nextRevisionDate) === 'dueSoon').length;

  return {
    t,
    currentUser,
    isGlobalAdmin,
    canManageEquipment,
    equipment,
    locations,
    currentLocation,
    searchQuery,
    filterType, setFilterType,
    addDialogOpen, setAddDialogOpen,
    bulkDialogOpen, setBulkDialogOpen,
    editingEquipment,
    snackbar, setSnackbar,
    activeTab, setActiveTab,
    tanks,
    tankDialogOpen, setTankDialogOpen,
    tankBulkDialogOpen, setTankBulkDialogOpen,
    editingTank,
    tankFilter, setTankFilter,
    tankSizeFilter, setTankSizeFilter,
    tankOrderBy, tankOrder,
    formData, setFormData,
    tankFormData, setTankFormData,
    isBikeRental, isSurfRental, isKiteSurfRental,
    handleSearch,
    handleAddEquipment,
    handleEditEquipment,
    handleToggleAvailability,
    handleSaveEquipment,
    handleDeleteEquipment,
    getRevisionStatus,
    getTestStatus,
    handleAddTank,
    handleEditTank,
    handleSaveTank,
    handleBulkImportTanks,
    handleDeleteTank,
    getTankMetadata,
    filteredTanks,
    handleTankSort,
    sortedTanks,
    overdueTanks,
    dueSoonTanks,
    handleBulkImport,
    allEquipmentList,
    filteredEquipment,
    getConditionColor,
    availableCount,
    totalCount,
    overdueCount,
    dueSoonCount,
  };
}
