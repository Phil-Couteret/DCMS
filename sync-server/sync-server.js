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

app.use(cors());
app.use(express.json());

// Get all data
app.get('/api/sync/all', (req, res) => {
  res.json(sharedStorage);
});

// Get specific resource
app.get('/api/sync/:resource', (req, res) => {
  const { resource } = req.params;
  const key = `dcms_${resource}`;
  res.json(sharedStorage[key] || []);
});

// Set specific resource
app.post('/api/sync/:resource', (req, res) => {
  const { resource } = req.params;
  const key = `dcms_${resource}`;
  const data = req.body;
  
  sharedStorage[key] = data;
  console.log(`[Sync Server] Updated ${key}:`, data.length || 0, 'items');
  
  res.json({ success: true, count: data.length || 0 });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ DCMS Sync Server running on http://localhost:${PORT}`);
  console.log('📡 This server syncs data between public website and admin portal\n');
});

