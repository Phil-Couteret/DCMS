import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerForm from '../components/Customer/CustomerForm';
import dataService from '../services/dataService';

const Customers = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const customerId = searchParams.get('id');

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!mode && !customerId) {
      loadCustomers();
    }
  }, [mode, customerId]);

  const loadCustomers = () => {
    const allCustomers = dataService.getAll('customers');
    setCustomers(allCustomers);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = dataService.searchCustomers(query);
      setCustomers(results);
    } else {
      loadCustomers();
    }
  };

  if (mode === 'new' || customerId) {
    return <CustomerForm />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/customers?mode=new')}
        >
          New Customer
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {customers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No results found' : 'No customers yet'}
          </Typography>
          {!searchQuery && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first customer to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/customers?mode=new')}
              >
                Create First Customer
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {customers.map((customer) => (
            <Grid item xs={12} md={6} lg={4} key={customer.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {customer.firstName} {customer.lastName}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/customers?id=${customer.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {customer.phone}
                  </Typography>
                  {customer.nationality && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Nationality: {customer.nationality}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Type: {customer.customerType || 'tourist'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Customers;
