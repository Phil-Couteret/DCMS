// Tank Service - Manages tank-specific metadata
// Since the equipment table doesn't have tank-specific fields, we store them separately

const STORAGE_KEY_TANKS = 'dcms_tank_metadata';

// Get all tank metadata
export const getAllTankMetadata = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TANKS);
    const metadata = stored ? JSON.parse(stored) : {};
    return metadata;
  } catch (error) {
    console.error('Error loading tank metadata:', error);
    return {};
  }
};

// Get metadata for a specific tank (by equipment ID)
export const getTankMetadata = (equipmentId) => {
  const allMetadata = getAllTankMetadata();
  return allMetadata[equipmentId] || {};
};

// Save metadata for a tank
export const saveTankMetadata = (equipmentId, metadata) => {
  try {
    const allMetadata = getAllTankMetadata();
    allMetadata[equipmentId] = {
      ...metadata,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_TANKS, JSON.stringify(allMetadata));
    return allMetadata[equipmentId];
  } catch (error) {
    console.error('Error saving tank metadata:', error);
    throw error;
  }
};

// Delete metadata for a tank
export const deleteTankMetadata = (equipmentId) => {
  try {
    const allMetadata = getAllTankMetadata();
    delete allMetadata[equipmentId];
    localStorage.setItem(STORAGE_KEY_TANKS, JSON.stringify(allMetadata));
    return true;
  } catch (error) {
    console.error('Error deleting tank metadata:', error);
    throw error;
  }
};

// Merge tank metadata with equipment item for display
export const enrichTankWithMetadata = (equipment) => {
  const metadata = getTankMetadata(equipment.id);
  return {
    ...equipment,
    ...metadata,
    // Preserve equipment fields, but allow metadata to override
    number: metadata.number || equipment.number,
    netColour: metadata.netColour || equipment.netColour,
    lastVisualTest: metadata.lastVisualTest || equipment.lastVisualTest,
    nextVisualTest: metadata.nextVisualTest || equipment.nextVisualTest,
    lastHydrostaticTest: metadata.lastHydrostaticTest || equipment.lastHydrostaticTest,
    nextHydrostaticTest: metadata.nextHydrostaticTest || equipment.nextHydrostaticTest,
    remarks: metadata.remarks || equipment.remarks || equipment.notes
  };
};

// Default export
export default {
  getAllTankMetadata,
  getTankMetadata,
  saveTankMetadata,
  deleteTankMetadata,
  enrichTankWithMetadata
};
