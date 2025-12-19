// Simple Sync Server for POC
// Syncs localStorage data between public website (port 3000) and admin portal (port 3001)
// Run: node sync-server/sync-server.js

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3002;

// In-memory storage (acts as shared localStorage)
const sharedStorage = {
  dcms_bookings: [],
  dcms_customers: [],
  dcms_locations: [],
  dcms_equipment: []
};

// Track last update time for each resource
const lastUpdate = {
  dcms_bookings: null,
  dcms_customers: null,
  dcms_locations: null,
  dcms_equipment: null
};

app.use(cors());
app.use(express.json());

// Get all data
app.get('/api/sync/all', (req, res) => {
  res.json(sharedStorage);
});

// Get last update timestamp for a resource (to check if data changed without downloading)
// This must be defined BEFORE the generic /:resource route to avoid route conflicts
app.get('/api/sync/:resource/lastUpdate', (req, res) => {
  const { resource } = req.params;
  const key = `dcms_${resource}`;
  res.json({ lastUpdate: lastUpdate[key] || null });
});

// Get specific resource
app.get('/api/sync/:resource', (req, res) => {
  const { resource } = req.params;
  const key = `dcms_${resource}`;
  const data = sharedStorage[key] || [];
  res.json(data);
});

// Set specific resource
app.post('/api/sync/:resource', (req, res) => {
  const { resource } = req.params;
  const key = `dcms_${resource}`;
  const data = req.body;
  
  sharedStorage[key] = data;
  lastUpdate[key] = Date.now(); // Track when this resource was updated
  console.log(`[Sync Server] ✅ Updated ${key}:`, data.length || 0, 'items');
  
  res.json({ success: true, count: data.length || 0, lastUpdate: lastUpdate[key] });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ DCMS Sync Server running on http://localhost:${PORT}`);
  console.log('📡 This server syncs data between public website and admin portal\n');
});

