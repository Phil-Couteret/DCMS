import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const BookingTrendsChart = ({ data, title = 'Booking Trends' }) => {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height: 300, mt: 2 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="confirmed" 
              stroke="#4caf50" 
              name="Confirmed"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke="#ff9800" 
              name="Pending"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#2196f3" 
              name="Completed"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default BookingTrendsChart;

