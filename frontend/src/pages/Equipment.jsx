import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ScubaDiving as EquipmentIcon,
  Search as SearchIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon
} from '@mui/icons-material';
import dataService from '../services/dataService';

const Equipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = () => {
    const allEquipment = dataService.getAll('equipment');
    setEquipment(allEquipment);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredEquipment = searchQuery
    ? equipment.filter(eq =>
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.serialNumber?.toLowerCase().includes(query.toLowerCase())
      )
    : equipment;

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'success',
      good: 'info',
      fair: 'warning',
      poor: 'error'
    };
    return colors[condition] || 'default';
  };

  const availableCount = equipment.filter(eq => eq.isAvailable).length;
  const totalCount = equipment.length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Equipment Tracking
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Equipment</Typography>
              <Typography variant="h4" color="primary">
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Available</Typography>
              <Typography variant="h4" color="success.main">
                {availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">In Use</Typography>
              <Typography variant="h4" color="warning.main">
                {totalCount - availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        placeholder="Search equipment by name, size, or serial number..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {filteredEquipment.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No equipment found' : 'No equipment registered'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEquipment.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {item.name}
                    </Typography>
                    {item.isAvailable ? (
                      <Chip
                        icon={<AvailableIcon />}
                        label="Available"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<UnavailableIcon />}
                        label="In Use"
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Category: {item.category}
                  </Typography>
                  {item.size && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Size: {item.size}
                    </Typography>
                  )}
                  {item.serialNumber && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Serial: {item.serialNumber}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={item.condition || 'excellent'}
                      color={getConditionColor(item.condition)}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Equipment;
