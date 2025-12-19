import React from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, Avatar } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

const TopCustomersList = ({ customers }) => {
  if (!customers || customers.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Top Customers
        </Typography>
        <Typography color="text.secondary">No customer data available</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Top Customers by Revenue
      </Typography>
      <List>
        {customers.map((customer, index) => (
          <ListItem
            key={customer.id}
            sx={{
              borderBottom: index < customers.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider'
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <PersonIcon />
            </Avatar>
            <ListItemText
              primary={customer.name}
              secondary={
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    €{customer.revenue.toFixed(2)} revenue
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customer.bookings} booking{customer.bookings !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              }
            />
            <Typography variant="h6" color="primary" sx={{ ml: 2 }}>
              #{index + 1}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default TopCustomersList;

