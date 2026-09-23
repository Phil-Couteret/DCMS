import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const RevenueChart = ({ data, title = 'Revenue Trend' }) => {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height: 300, mt: 2 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`€${value.toFixed(2)}`, 'Revenue']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#1976d2" 
              fill="#1976d2" 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default RevenueChart;

