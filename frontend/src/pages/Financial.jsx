import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Card,
  CardContent,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import financialService from '../services/financialService';
import dataService from '../services/dataService';
import { useTranslation } from '../utils/languageContext';
import { useAuth, USER_ROLES } from '../utils/authContext';
import { hasDivingFeatures } from '../utils/locationTypes';

const Financial = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showCloseDayDialog, setShowCloseDayDialog] = useState(false);
  const [dailyReportHtml, setDailyReportHtml] = useState('');
  
  // Bills tab state
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Previous Closed Days state
  const [storedReports, setStoredReports] = useState([]);
  const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Quarterly IGIC Declaration state
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    return Math.floor(month / 3) + 1; // Q1=1, Q2=2, Q3=3, Q4=4
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [igicDeclaration, setIgicDeclaration] = useState(null);
  const [igicLoading, setIgicLoading] = useState(false);
  const [settings, setSettings] = useState({ prices: {} });
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    category: 'gasoline',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [incomeFormData, setIncomeFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const expenseCategories = [
    { value: 'gasoline', label: 'Gasoline' },
    { value: 'tank_net', label: 'Tank Net' },
    { value: 'glue', label: 'Glue' },
    { value: 'equipment', label: 'New Equipment' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  const isAdmin = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPERADMIN;

  const [currentLocationId, setCurrentLocationId] = useState(() => localStorage.getItem('dcms_current_location'));
  const currentLocation = locations.find(l => l.id === currentLocationId);
  const isBikeRental = currentLocation ? !hasDivingFeatures(currentLocation, settings) : false;

  // Update currentLocationId when location changes
  useEffect(() => {
    const onLocChange = () => {
      const newLocationId = localStorage.getItem('dcms_current_location');
      setCurrentLocationId(newLocationId);
    };
    // Initial load
    const storedLocationId = localStorage.getItem('dcms_current_location');
    setCurrentLocationId(storedLocationId);
    
    window.addEventListener('dcms_location_changed', onLocChange);
    window.addEventListener('storage', onLocChange);
    return () => {
      window.removeEventListener('dcms_location_changed', onLocChange);
      window.removeEventListener('storage', onLocChange);
    };
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const allCustomers = await dataService.getAll('customers');
      setCustomers(Array.isArray(allCustomers) ? allCustomers : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const allLocations = await dataService.getAll('locations');
      setLocations(Array.isArray(allLocations) ? allLocations : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    // Settings are now loaded from location pricing, but we keep this for backward compatibility
    // Tax settings are read from current location's pricing
    try {
      const allSettings = await dataService.getAll('settings');
      if (Array.isArray(allSettings) && allSettings.length > 0) {
        setSettings(allSettings[0]);
      } else {
        setSettings({ prices: {} });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings({ prices: {} });
    }
  }, []);

  const loadFinancialSummary = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate;
      const summary = await financialService.getDailyFinancialSummary(dateStr);
      setFinancialSummary(summary);
    } catch (error) {
      console.error('Error loading financial summary:', error);
      setFinancialSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCustomers();
    loadLocations();
    loadSettings();
  }, [loadCustomers, loadLocations, loadSettings]);


  // Load bills for Historical Bills tab
  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    try {
      const allBills = await dataService.getAll('customerBills') || [];
      // Filter bills by location unless in global scope
      const scope = localStorage.getItem('dcms_dashboard_scope');
      const isGlobal = scope === 'global';
      let filteredBills = Array.isArray(allBills) ? allBills : [];
      
      if (!isGlobal) {
        const currentLocationId = localStorage.getItem('dcms_current_location');
        if (currentLocationId) {
          filteredBills = filteredBills.filter(bill => {
            const billLocationId = bill.locationId || bill.location_id;
            return billLocationId === currentLocationId;
          });
        }
      }
      
      setBills(filteredBills);
    } catch (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }, []);

  // Load stored reports for Previous Closed Days tab
  const loadStoredReports = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dcms_stored_reports') || '[]');
      let reports = Array.isArray(stored) ? stored : [];
      
      // Filter by location unless in global scope
      const scope = localStorage.getItem('dcms_dashboard_scope');
      const isGlobal = scope === 'global';
      
      if (!isGlobal && currentLocationId) {
        reports = reports.filter(report => {
          const reportLocationId = report.locationId || report.location_id;
          return reportLocationId === currentLocationId;
        });
      }
      
      setStoredReports(reports);
    } catch (error) {
      console.error('Error loading stored reports:', error);
      setStoredReports([]);
    }
  }, [currentLocationId]);

  // Calculate quarter date range
  const getQuarterDateRange = (quarter, year) => {
    const startMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0); // Last day of the quarter
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  // Load quarterly IGIC declaration data
  const loadIgicDeclaration = useCallback(async () => {
    setIgicLoading(true);
    try {
      const { start, end } = getQuarterDateRange(selectedQuarter, selectedYear);
      const scope = localStorage.getItem('dcms_dashboard_scope');
      const isGlobal = scope === 'global';
      const currentLocationId = isGlobal ? null : localStorage.getItem('dcms_current_location');
      
      // Get tax name and rate from current location's pricing (location-specific)
      const currentLoc = locations.find(l => l.id === currentLocationId);
      const taxName = currentLoc?.pricing?.tax?.tax_name || currentLoc?.settings?.pricing?.tax?.tax_name || 'IGIC';
      const igicRate = currentLoc?.pricing?.tax?.igic_rate || currentLoc?.settings?.pricing?.tax?.igic_rate || 0.07;
      
      // Load all bills for the quarter
      const allBills = await dataService.getAll('customerBills') || [];
      let quarterBills = Array.isArray(allBills) ? allBills : [];
      
      // Filter by date range and location
      quarterBills = quarterBills.filter(bill => {
        const billDate = bill.billDate || bill.bill_date;
        if (!billDate) return false;
        const billDateStr = billDate instanceof Date 
          ? billDate.toISOString().split('T')[0] 
          : billDate.toString().split('T')[0];
        const dateMatch = billDateStr >= start && billDateStr <= end;
        
        if (!dateMatch) return false;
        if (!isGlobal && currentLocationId) {
          const billLocationId = bill.locationId || bill.location_id;
          return billLocationId === currentLocationId;
        }
        return true;
      });
      
      // Calculate sales (Ventas)
      const salesBaseImponible = quarterBills.reduce((sum, bill) => {
        return sum + (parseFloat(bill.subtotal) || 0);
      }, 0);
      
      const salesCuotaDevengada = quarterBills.reduce((sum, bill) => {
        return sum + (parseFloat(bill.tax) || 0);
      }, 0);
      
      // Load expenses for the quarter
      const allExpenses = financialService.getAllExpenses();
      let quarterExpenses = allExpenses.filter(exp => {
        const expDate = exp.date;
        if (!expDate) return false;
        const expDateStr = expDate instanceof Date 
          ? expDate.toISOString().split('T')[0] 
          : expDate.toString().split('T')[0];
        const dateMatch = expDateStr >= start && expDateStr <= end;
        
        if (!dateMatch) return false;
        if (!isGlobal && currentLocationId) {
          const expLocationId = exp.locationId || exp.location_id;
          return expLocationId === currentLocationId;
        }
        return true;
      });
      
      // Calculate purchases/expenses (Compras)
      // For expenses, we assume they include IGIC and calculate the base and tax
      const expensesTotal = quarterExpenses.reduce((sum, exp) => {
        return sum + (parseFloat(exp.amount) || 0);
      }, 0);
      
      // Calculate base imponible from expenses (assuming expenses include IGIC)
      // If amount includes IGIC: base = amount / (1 + igicRate)
      const purchasesBaseImponible = quarterExpenses.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        // If expense has a base field, use it; otherwise calculate from total
        if (exp.baseImponible !== undefined) {
          return sum + parseFloat(exp.baseImponible);
        }
        // Assume amount includes IGIC, so base = amount / (1 + rate)
        return sum + (amount / (1 + igicRate));
      }, 0);
      
      const purchasesCuotaSoportada = quarterExpenses.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        // If expense has a tax field, use it; otherwise calculate from total
        if (exp.tax !== undefined) {
          return sum + parseFloat(exp.tax);
        }
        // Calculate IGIC from amount: tax = amount - base
        const base = exp.baseImponible !== undefined 
          ? parseFloat(exp.baseImponible) 
          : (amount / (1 + igicRate));
        return sum + (amount - base);
      }, 0);
      
      // Calculate net IGIC to pay
      const netIgicToPay = salesCuotaDevengada - purchasesCuotaSoportada;
      
      setIgicDeclaration({
        quarter: selectedQuarter,
        year: selectedYear,
        dateRange: { start, end },
        sales: {
          baseImponible: salesBaseImponible,
          cuotaDevengada: salesCuotaDevengada,
          numberOfBills: quarterBills.length
        },
        purchases: {
          baseImponible: purchasesBaseImponible,
          cuotaSoportada: purchasesCuotaSoportada,
          numberOfExpenses: quarterExpenses.length
        },
        netIgicToPay,
        igicRate,
        taxName
      });
    } catch (error) {
      console.error('Error loading IGIC declaration:', error);
      setIgicDeclaration(null);
    } finally {
      setIgicLoading(false);
    }
  }, [selectedQuarter, selectedYear, settings, currentLocationId]);

  useEffect(() => {
    // Tab indices: 
    // For diving: 0=Current Financial, 1=Previous Closed Days, 2=Historical Bills, 3=IGIC Declaration
    // For bike rental: 0=Current Financial, 1=Historical Bills, 2=IGIC Declaration
    
    if (activeTab === 0) {
      loadFinancialSummary();
    } else if (activeTab === 1 && !isBikeRental) {
      loadStoredReports();
    } else if ((activeTab === 2 && !isBikeRental) || (activeTab === 1 && isBikeRental)) {
      loadBills();
      loadCustomers();
    } else if ((activeTab === 3 && !isBikeRental) || (activeTab === 2 && isBikeRental)) {
      // IGIC Declaration tab
      loadIgicDeclaration();
    }
  }, [activeTab, isBikeRental, loadStoredReports, loadBills, loadCustomers, loadFinancialSummary, loadIgicDeclaration, currentLocationId]);

  // Reload stored reports when scope changes (location to global or vice versa)
  useEffect(() => {
    if (activeTab === 1 && !isBikeRental) {
      const onScopeChange = () => {
        loadStoredReports();
      };
      window.addEventListener('dcms_location_changed', onScopeChange);
      window.addEventListener('storage', (e) => {
        if (e.key === 'dcms_dashboard_scope') {
          loadStoredReports();
        }
      });
      return () => {
        window.removeEventListener('dcms_location_changed', onScopeChange);
      };
    }
  }, [activeTab, isBikeRental, loadStoredReports]);

  // Reload IGIC declaration when quarter or year changes
  useEffect(() => {
    if ((activeTab === 3 && !isBikeRental) || (activeTab === 2 && isBikeRental)) {
      if (locations.length > 0) {
        loadIgicDeclaration();
      }
    }
  }, [selectedQuarter, selectedYear, activeTab, isBikeRental, locations, loadIgicDeclaration, currentLocationId]);

  // Reload IGIC declaration when scope or location changes
  useEffect(() => {
    if ((activeTab === 3 && !isBikeRental) || (activeTab === 2 && isBikeRental)) {
      const onScopeChange = () => {
        if (locations.length > 0) {
          loadIgicDeclaration();
        }
      };
      window.addEventListener('dcms_location_changed', onScopeChange);
      window.addEventListener('storage', (e) => {
        if (e.key === 'dcms_dashboard_scope' || e.key === 'dcms_current_location') {
          if (locations.length > 0) {
            loadIgicDeclaration();
          }
        }
      });
      return () => {
        window.removeEventListener('dcms_location_changed', onScopeChange);
      };
    }
  }, [activeTab, isBikeRental, locations, currentLocationId, loadIgicDeclaration]);

  useEffect(() => {
    filterBills();
  }, [bills, customerFilter, startDate, endDate]);

  // Reset to tab 0 if switching to bike rental while on Closed Days tab
  useEffect(() => {
    if (activeTab === 1 && isBikeRental) {
      setActiveTab(0);
    }
  }, [isBikeRental, activeTab]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleAddExpense = () => {
    setExpenseFormData({
      description: '',
      category: 'gasoline',
      amount: '',
      date: selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate,
      notes: ''
    });
    setShowExpenseDialog(true);
  };

  const handleAddIncome = () => {
    setIncomeFormData({
      description: '',
      amount: '',
      date: selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate,
      notes: ''
    });
    setShowIncomeDialog(true);
  };

  const handleSaveExpense = () => {
    if (!expenseFormData.description || !expenseFormData.amount) {
      return;
    }
    try {
      financialService.addExpense(expenseFormData);
      setShowExpenseDialog(false);
      loadFinancialSummary();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
    }
  };

  const handleSaveIncome = () => {
    if (!incomeFormData.description || !incomeFormData.amount) {
      return;
    }
    try {
      financialService.addManualIncome(incomeFormData);
      setShowIncomeDialog(false);
      loadFinancialSummary();
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Error saving income. Please try again.');
    }
  };

  const handleDeleteExpense = (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        financialService.deleteExpense(expenseId);
        loadFinancialSummary();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  const handleDeleteIncome = (incomeId) => {
    if (window.confirm('Are you sure you want to delete this income entry?')) {
      try {
        financialService.deleteManualIncome(incomeId);
        loadFinancialSummary();
      } catch (error) {
        console.error('Error deleting income:', error);
        alert('Error deleting income. Please try again.');
      }
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Unknown';
  };

  const filterBills = () => {
    let filtered = [...bills];

    if (customerFilter) {
      filtered = filtered.filter(bill => {
        const billCustomerId = bill.customerId || bill.customer_id;
        return billCustomerId === customerFilter;
      });
    }

    if (startDate) {
      filtered = filtered.filter(bill => {
        const billDate = bill.billDate || bill.bill_date;
        return billDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(bill => {
        const billDate = bill.billDate || bill.bill_date;
        return billDate <= endDate;
      });
    }

    setFilteredBills(filtered);
  };

  const getBillCustomerName = (bill) => {
    if (bill.customer) {
      const firstName = bill.customer.firstName || bill.customer.first_name || '';
      const lastName = bill.customer.lastName || bill.customer.last_name || '';
      return `${firstName} ${lastName}`.trim() || bill.customer.email || 'Unknown';
    }
    const customer = customers.find(c => c.id === (bill.customerId || bill.customer_id));
    if (customer) {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Unknown';
    }
    return 'Unknown';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch {
      return date;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€0.00';
    return `€${parseFloat(amount || 0).toFixed(2)}`;
  };

  const generateDailyReportHTML = () => {
    if (!financialSummary) return '';
    
    const dateStr = selectedDate instanceof Date 
      ? selectedDate.toISOString().split('T')[0] 
      : selectedDate;
    const location = locations.find(l => l.id === localStorage.getItem('dcms_current_location'));
    const locationName = location?.name || 'All Locations';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Financial Report - ${dateStr}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #fff;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #1976d2; 
            margin: 0;
          }
          .header h2 {
            color: #666;
            margin: 10px 0;
            font-weight: normal;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #ddd;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            font-weight: normal;
          }
          .summary-card .amount {
            font-size: 32px;
            font-weight: bold;
            color: #1976d2;
          }
          .summary-card.income .amount { color: #2e7d32; }
          .summary-card.expense .amount { color: #d32f2f; }
          .summary-card.profit .amount { color: #ed6c02; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 14px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          th { 
            background-color: #1976d2; 
            color: white; 
            font-weight: bold;
          }
          tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          .section {
            margin: 40px 0;
            page-break-inside: avoid;
          }
          .section-title {
            color: #1976d2;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 24px;
          }
          .footer { 
            margin-top: 60px; 
            font-size: 12px; 
            color: #666; 
            text-align: center; 
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge-diving { background-color: #2196f3; color: white; }
          .badge-discovery { background-color: #9c27b0; color: white; }
          .badge-snorkeling { background-color: #00bcd4; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Financial Report</h1>
          <h2>${locationName}</h2>
          <p><strong>Date:</strong> ${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-cards">
          <div class="summary-card income">
            <h3>Total Income</h3>
            <div class="amount">${formatCurrency(financialSummary.totalIncome)}</div>
          </div>
          <div class="summary-card expense">
            <h3>Total Expenses</h3>
            <div class="amount">${formatCurrency(financialSummary.expenses.total)}</div>
          </div>
          <div class="summary-card profit">
            <h3>Net Profit</h3>
            <div class="amount">${formatCurrency(financialSummary.netProfit)}</div>
          </div>
          <div class="summary-card">
            <h3>Booking Income</h3>
            <div class="amount">${formatCurrency(financialSummary.bookingIncome.total)}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Income from Bookings</h2>
          <table>
            <thead>
              <tr>
                <th>Activity Type</th>
                <th class="text-center">Number of Dives</th>
                <th class="text-right">Total Income</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="badge badge-diving">Diving</span></td>
                <td class="text-center">${financialSummary.bookingIncome.details
                  .filter(d => d.activityType === 'diving')
                  .reduce((sum, d) => sum + d.numberOfDives, 0)}</td>
                <td class="text-right">${formatCurrency(financialSummary.bookingIncome.diving)}</td>
              </tr>
              <tr>
                <td><span class="badge badge-discovery">Discovery</span></td>
                <td class="text-center">${financialSummary.bookingIncome.details
                  .filter(d => d.activityType === 'discover' || d.activityType === 'discovery' || d.activityType === 'try_dive' || d.activityType === 'try_scuba' || d.activityType === 'orientation')
                  .reduce((sum, d) => sum + d.numberOfDives, 0)}</td>
                <td class="text-right">${formatCurrency(financialSummary.bookingIncome.discovery)}</td>
              </tr>
              <tr>
                <td><span class="badge badge-snorkeling">Snorkeling</span></td>
                <td class="text-center">${financialSummary.bookingIncome.details
                  .filter(d => d.activityType === 'snorkeling' || d.activityType === 'snorkel')
                  .reduce((sum, d) => sum + d.numberOfDives, 0)}</td>
                <td class="text-right">${formatCurrency(financialSummary.bookingIncome.snorkeling)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${financialSummary.bookingIncome.details.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Booking Details</h2>
          <table>
            <thead>
              <tr>
                <th>Activity Type</th>
                <th>Customer</th>
                <th class="text-center">Number of Dives</th>
                <th class="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${financialSummary.bookingIncome.details.map((detail) => {
                const activityTypeLabel = detail.activityType === 'diving' ? 'Diving' : 
                  (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'Discovery' :
                  'Snorkeling';
                const badgeClass = detail.activityType === 'diving' ? 'badge-diving' : 
                  (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'badge-discovery' :
                  'badge-snorkeling';
                return `
                  <tr>
                    <td><span class="badge ${badgeClass}">${activityTypeLabel}</span></td>
                    <td>${getCustomerName(detail.customerId)}</td>
                    <td class="text-center">${detail.numberOfDives}</td>
                    <td class="text-right">${formatCurrency(detail.price)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${financialSummary.manualIncome.entries.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Manual Income</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${financialSummary.manualIncome.entries.map((income) => `
                <tr>
                  <td>${income.description}</td>
                  <td class="text-right">${formatCurrency(income.amount)}</td>
                  <td>${income.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #e3f2fd;">
                <td>Total Manual Income</td>
                <td class="text-right">${formatCurrency(financialSummary.manualIncome.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        ${financialSummary.expenses.entries.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Expenses</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th class="text-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${financialSummary.expenses.entries.map((expense) => {
                const categoryLabel = expenseCategories.find(c => c.value === expense.category)?.label || expense.category;
                return `
                  <tr>
                    <td>${categoryLabel}</td>
                    <td>${expense.description}</td>
                    <td class="text-right">${formatCurrency(expense.amount)}</td>
                    <td>${expense.notes || '-'}</td>
                  </tr>
                `;
              }).join('')}
              <tr style="font-weight: bold; background-color: #ffebee;">
                <td colspan="2">Total Expenses</td>
                <td class="text-right">${formatCurrency(financialSummary.expenses.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>This report was generated by DCMS - Dive Center Management System</p>
          <p>Deep Blue Diving - Fuerteventura, Canary Islands, Spain</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  };

  const handleCloseDay = () => {
    const html = generateDailyReportHTML();
    setDailyReportHtml(html);
    setShowCloseDayDialog(true);
  };

  const handleDownloadReport = () => {
    const html = dailyReportHtml || generateDailyReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = selectedDate instanceof Date 
      ? selectedDate.toISOString().split('T')[0] 
      : selectedDate;
    link.setAttribute('download', `daily_financial_report_${dateStr}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStoreReport = () => {
    try {
      const dateStr = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate;
      // Always store the location when closing a day (even in global scope, we're closing for a specific location)
      const locationIdToStore = currentLocationId;
      const locationNameToStore = currentLocation?.name || 'All Locations';
      
      if (!locationIdToStore && !currentLocation) {
        alert('Error: No location selected. Please select a location before closing the day.');
        return;
      }
      
      const storedReports = JSON.parse(localStorage.getItem('dcms_stored_reports') || '[]');
      const report = {
        id: Date.now().toString(),
        date: dateStr,
        locationId: locationIdToStore,
        locationName: locationNameToStore,
        html: dailyReportHtml || generateDailyReportHTML(),
        storedAt: new Date().toISOString(),
        financialSummary: financialSummary
      };
      storedReports.push(report);
      localStorage.setItem('dcms_stored_reports', JSON.stringify(storedReports));
      alert(`Report stored successfully for ${locationNameToStore}!`);
      loadStoredReports(); // Reload to show the new report
    } catch (error) {
      console.error('Error storing report:', error);
      alert('Error storing report. Please try again.');
    }
  };

  const handleEmailReport = () => {
    const dateStr = selectedDate instanceof Date 
      ? selectedDate.toISOString().split('T')[0] 
      : selectedDate;
    const subject = encodeURIComponent(`Daily Financial Report - ${dateStr}`);
    const body = encodeURIComponent(
      `Please find attached the daily financial report for ${dateStr}.\n\n` +
      `Total Income: ${formatCurrency(financialSummary.totalIncome)}\n` +
      `Total Expenses: ${formatCurrency(financialSummary.expenses.total)}\n` +
      `Net Profit: ${formatCurrency(financialSummary.netProfit)}\n\n` +
      `The detailed report is attached.\n\n` +
      `Best regards,\nDCMS`
    );
    
    // For email, we'll include the HTML content in the body and suggest attaching the downloaded file
    // In a real implementation, you'd use an email service API
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setViewBillDialogOpen(true);
  };

  const handlePrintBill = (bill) => {
    window.print();
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setViewReportDialogOpen(true);
  };

  const generateIgicDeclarationHTML = (declaration) => {
    if (!declaration) return '';
    
    const location = locations.find(l => l.id === localStorage.getItem('dcms_current_location'));
    const locationName = location?.name || 'All Locations';
    const quarterNames = ['', 'Q1 (January - March)', 'Q2 (April - June)', 'Q3 (July - September)', 'Q4 (October - December)'];
    const taxName = declaration.taxName || 'IGIC';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${taxName} Declaration - ${quarterNames[declaration.quarter]} ${declaration.year}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #fff;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #1976d2; 
            margin: 0;
          }
          .header h2 {
            color: #666;
            margin: 10px 0;
            font-weight: normal;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #ddd;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            font-weight: normal;
          }
          .summary-card .amount {
            font-size: 32px;
            font-weight: bold;
            color: #1976d2;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 14px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          th { 
            background-color: #1976d2; 
            color: white; 
            font-weight: bold;
          }
          tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          .net-result {
            background-color: ${declaration.netIgicToPay >= 0 ? '#c8e6c9' : '#bbdefb'};
            font-weight: bold;
            font-size: 16px;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { 
            margin-top: 60px; 
            font-size: 12px; 
            color: #666; 
            text-align: center; 
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${taxName} Quarterly Declaration</h1>
          <h2>${locationName}</h2>
          <p><strong>Period:</strong> ${quarterNames[declaration.quarter]} ${declaration.year}</p>
          <p><strong>Date Range:</strong> ${format(new Date(declaration.dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(declaration.dateRange.end), 'dd/MM/yyyy')}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>Sales Base (Base Imponible)</h3>
            <div class="amount">${formatCurrency(declaration.sales.baseImponible)}</div>
            <p style="margin-top: 10px; font-size: 12px;">${declaration.sales.numberOfBills} bills</p>
          </div>
          <div class="summary-card">
            <h3>${taxName} Collected (Cuota Devengada)</h3>
            <div class="amount" style="color: #2e7d32;">${formatCurrency(declaration.sales.cuotaDevengada)}</div>
            <p style="margin-top: 10px; font-size: 12px;">${taxName} Rate: ${(declaration.igicRate * 100).toFixed(1)}%</p>
          </div>
          <div class="summary-card">
            <h3>Purchases Base (Base Imponible)</h3>
            <div class="amount" style="color: #0288d1;">${formatCurrency(declaration.purchases.baseImponible)}</div>
            <p style="margin-top: 10px; font-size: 12px;">${declaration.purchases.numberOfExpenses} expenses</p>
          </div>
          <div class="summary-card">
            <h3>${taxName} Paid (Cuota Soportada)</h3>
            <div class="amount" style="color: #f57c00;">${formatCurrency(declaration.purchases.cuotaSoportada)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Concept</th>
              <th class="text-right">Base Imponible</th>
              <th class="text-right">${taxName} (${(declaration.igicRate * 100).toFixed(1)}%)</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sales (Ventas)</strong></td>
              <td class="text-right">${formatCurrency(declaration.sales.baseImponible)}</td>
              <td class="text-right">${formatCurrency(declaration.sales.cuotaDevengada)}</td>
              <td class="text-right">${formatCurrency(declaration.sales.baseImponible + declaration.sales.cuotaDevengada)}</td>
            </tr>
            <tr>
              <td><strong>Purchases (Compras)</strong></td>
              <td class="text-right">${formatCurrency(declaration.purchases.baseImponible)}</td>
              <td class="text-right">${formatCurrency(declaration.purchases.cuotaSoportada)}</td>
              <td class="text-right">${formatCurrency(declaration.purchases.baseImponible + declaration.purchases.cuotaSoportada)}</td>
            </tr>
            <tr class="net-result">
              <td><strong>Net ${taxName} to ${declaration.netIgicToPay >= 0 ? 'Pay' : 'Receive'}</strong></td>
              <td class="text-right">-</td>
              <td class="text-right"><strong>${formatCurrency(Math.abs(declaration.netIgicToPay))}</strong></td>
              <td class="text-right">-</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This declaration was generated by DCMS - Dive Center Management System</p>
          <p>Deep Blue Diving - Fuerteventura, Canary Islands, Spain</p>
          <p><strong>Note:</strong> This is a summary document. Please verify all amounts before submitting to Hacienda/AEAT.</p>
        </div>
      </body>
      </html>
    `;
  };

  // Compute tax name from current location's pricing (location-specific)
  const taxName = currentLocation?.pricing?.tax?.tax_name || currentLocation?.settings?.pricing?.tax?.tax_name || 'IGIC';
  const taxRate = currentLocation?.pricing?.tax?.igic_rate || currentLocation?.settings?.pricing?.tax?.igic_rate || 0.07;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Financial
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Current Financial" icon={<MoneyIcon />} iconPosition="start" />
          {!isBikeRental && (
            <Tab label="Previous Closed Days" icon={<HistoryIcon />} iconPosition="start" />
          )}
          <Tab label="Historical Bills" icon={<ReceiptIcon />} iconPosition="start" />
          <Tab label={`Quarterly ${taxName} Declaration`} icon={<DescriptionIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Select Date"
                type="date"
                value={selectedDate instanceof Date 
                  ? selectedDate.toISOString().split('T')[0] 
                  : selectedDate}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
              {isAdmin && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<TrendingDownIcon />}
                    onClick={handleAddExpense}
                  >
                    Add Expense
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<TrendingUpIcon />}
                    onClick={handleAddIncome}
                  >
                    Add Income
                  </Button>
                  {!isBikeRental && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CloseIcon />}
                      onClick={handleCloseDay}
                    >
                      Close the Day
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Box>

          {loading ? (
            <Typography>Loading financial data...</Typography>
          ) : !financialSummary ? (
            <Alert severity="error">Error loading financial data. Please try again.</Alert>
          ) : (
            <>
              {/* Daily Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Income
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(financialSummary.totalIncome)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4" color="error">
                {formatCurrency(financialSummary.expenses.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Net Profit
              </Typography>
              <Typography 
                variant="h4" 
                color={financialSummary.netProfit >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(financialSummary.netProfit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Booking Income
              </Typography>
              <Typography variant="h4" color="info.main">
                {formatCurrency(financialSummary.bookingIncome.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Income Breakdown */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Income from Bookings
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Diving: {formatCurrency(financialSummary.bookingIncome.diving)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'diving')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Discovery: {formatCurrency(financialSummary.bookingIncome.discovery)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'discover' || d.activityType === 'discovery' || d.activityType === 'try_dive' || d.activityType === 'try_scuba' || d.activityType === 'orientation')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Snorkeling: {formatCurrency(financialSummary.bookingIncome.snorkeling)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'snorkeling' || d.activityType === 'snorkel')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
        </Grid>

        {financialSummary.bookingIncome.details.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Activity Type</TableCell>
                  <TableCell>Number of Dives</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Customer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.bookingIncome.details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <Chip 
                        label={detail.activityType === 'diving' ? 'Diving' : 
                               (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'Discovery' :
                               'Snorkeling'}
                        size="small"
                        color={detail.activityType === 'diving' ? 'primary' : 
                               (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'secondary' :
                               'info'}
                      />
                    </TableCell>
                    <TableCell>{detail.numberOfDives}</TableCell>
                    <TableCell>{formatCurrency(detail.price)}</TableCell>
                    <TableCell>{getCustomerName(detail.customerId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Manual Income */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Manual Income (Not from Bookings)
          </Typography>
          <Typography variant="body1" color="primary">
            Total: {formatCurrency(financialSummary.manualIncome.total)}
          </Typography>
        </Box>
        {financialSummary.manualIncome.entries.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Notes</TableCell>
                  {isAdmin && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.manualIncome.entries.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{income.description}</TableCell>
                    <TableCell>{formatCurrency(income.amount)}</TableCell>
                    <TableCell>{income.notes || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteIncome(income.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No manual income entries for this date.
          </Typography>
        )}
      </Paper>

      {/* Expenses */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Expenses
          </Typography>
          <Typography variant="body1" color="error">
            Total: {formatCurrency(financialSummary.expenses.total)}
          </Typography>
        </Box>
        {financialSummary.expenses.entries.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Notes</TableCell>
                  {isAdmin && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.expenses.entries.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Chip 
                        label={expenseCategories.find(c => c.value === expense.category)?.label || expense.category}
                        size="small"
                        color="error"
                      />
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.notes || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No expenses recorded for this date.
          </Typography>
        )}
      </Paper>
            </>
          )}
        </Box>
      )}

      {activeTab === 1 && !isBikeRental && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Previous Closed Days</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadStoredReports}
            >
              Refresh
            </Button>
          </Box>
          {storedReports.length === 0 ? (
            <Alert severity="info">No stored reports found. Reports are stored when you close a day.</Alert>
          ) : (() => {
            const scope = localStorage.getItem('dcms_dashboard_scope');
            const isGlobal = scope === 'global';
            
            // Group reports by location if in global scope
            if (isGlobal) {
              const groupedByLocation = storedReports.reduce((acc, report) => {
                const locationId = report.locationId || report.location_id;
                const locationName = report.locationName || 
                  (locationId ? locations.find(l => l.id === locationId)?.name : null) || 
                  'All Locations';
                // Use locationId or 'unknown' as key to handle null values
                const groupKey = locationId || 'unknown';
                if (!acc[groupKey]) {
                  acc[groupKey] = {
                    locationId,
                    locationName,
                    reports: []
                  };
                }
                acc[groupKey].reports.push(report);
                return acc;
              }, {});
              
              const locationGroups = Object.values(groupedByLocation);
              
              return (
                <>
                  {locationGroups.map((group) => (
                    <Box key={group.locationId} sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                        {group.locationName}
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Stored At</TableCell>
                              <TableCell>Total Income</TableCell>
                              <TableCell>Total Expenses</TableCell>
                              <TableCell>Net Profit</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.reports
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .map((report) => (
                                <TableRow key={report.id}>
                                  <TableCell>{formatDate(report.date)}</TableCell>
                                  <TableCell>{formatDate(report.storedAt)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.totalIncome)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.expenses?.total)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.netProfit)}</TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="View Report">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewReport(report)}
                                      >
                                        <ViewIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </>
              );
            } else {
              // Single location view
              return (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Stored At</TableCell>
                        <TableCell>Total Income</TableCell>
                        <TableCell>Total Expenses</TableCell>
                        <TableCell>Net Profit</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {storedReports
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>{formatDate(report.date)}</TableCell>
                            <TableCell>{formatDate(report.storedAt)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.totalIncome)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.expenses?.total)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.netProfit)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Report">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewReport(report)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
            }
          })()}
        </Box>
      )}

      {((activeTab === 3 && !isBikeRental) || (activeTab === 2 && isBikeRental)) && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5">Quarterly {igicDeclaration?.taxName || taxName} Declaration</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadIgicDeclaration}
            >
              Refresh
            </Button>
          </Box>

          {/* Quarter and Year Selector */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={selectedQuarter}
                    label="Quarter"
                    onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                  >
                    <MenuItem value={1}>Q1 (Jan - Mar)</MenuItem>
                    <MenuItem value={2}>Q2 (Apr - Jun)</MenuItem>
                    <MenuItem value={3}>Q3 (Jul - Sep)</MenuItem>
                    <MenuItem value={4}>Q4 (Oct - Dec)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                  inputProps={{ min: 2020, max: 2100 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Period: {igicDeclaration?.dateRange ? 
                    `${format(new Date(igicDeclaration.dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(igicDeclaration.dateRange.end), 'dd/MM/yyyy')}` 
                    : getQuarterDateRange(selectedQuarter, selectedYear).start + ' - ' + getQuarterDateRange(selectedQuarter, selectedYear).end}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {igicLoading ? (
            <Typography>Loading {taxName} declaration data...</Typography>
          ) : igicDeclaration ? (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Sales Base (Base Imponible)
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(igicDeclaration.sales.baseImponible)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.sales.numberOfBills} bills
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        {igicDeclaration.taxName || 'IGIC'} Collected (Cuota Devengada)
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(igicDeclaration.sales.cuotaDevengada)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.taxName || 'IGIC'} Rate: {(igicDeclaration.igicRate * 100).toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Purchases Base (Base Imponible)
                      </Typography>
                      <Typography variant="h4" color="info.main">
                        {formatCurrency(igicDeclaration.purchases.baseImponible)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.purchases.numberOfExpenses} expenses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        {igicDeclaration.taxName || 'IGIC'} Paid (Cuota Soportada)
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {formatCurrency(igicDeclaration.purchases.cuotaSoportada)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Net IGIC Result */}
              <Paper sx={{ p: 3, mb: 3, bgcolor: igicDeclaration.netIgicToPay >= 0 ? 'success.light' : 'info.light' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom>
                      Net {igicDeclaration.taxName || 'IGIC'} to {igicDeclaration.netIgicToPay >= 0 ? 'Pay' : 'Receive'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resultado a {igicDeclaration.netIgicToPay >= 0 ? 'ingresar' : 'compensar'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography 
                      variant="h3" 
                      color={igicDeclaration.netIgicToPay >= 0 ? 'success.main' : 'info.main'}
                      fontWeight="bold"
                    >
                      {formatCurrency(Math.abs(igicDeclaration.netIgicToPay))}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Detailed Breakdown */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Detailed Breakdown
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Concept</strong></TableCell>
                        <TableCell align="right"><strong>Base Imponible</strong></TableCell>
                        <TableCell align="right"><strong>{igicDeclaration.taxName || 'IGIC'} ({(igicDeclaration.igicRate * 100).toFixed(1)}%)</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Sales (Ventas)</strong></TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.baseImponible)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.cuotaDevengada)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.baseImponible + igicDeclaration.sales.cuotaDevengada)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Purchases (Compras)</strong></TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.baseImponible)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.cuotaSoportada)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.baseImponible + igicDeclaration.purchases.cuotaSoportada)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Net Result</strong></TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(igicDeclaration.netIgicToPay)}</strong>
                        </TableCell>
                        <TableCell align="right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Action Buttons */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    const html = generateIgicDeclarationHTML(igicDeclaration);
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                >
                  Print Declaration
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const html = generateIgicDeclarationHTML(igicDeclaration);
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const taxName = (igicDeclaration.taxName || 'IGIC').toLowerCase();
                    link.setAttribute('download', `${taxName}_declaration_Q${igicDeclaration.quarter}_${igicDeclaration.year}.html`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Declaration
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              Select a quarter and year, then the declaration will be calculated automatically.
            </Alert>
          )}
        </Box>
      )}

      {((activeTab === 2 && !isBikeRental) || (activeTab === 1 && isBikeRental)) && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5">Historical Bills</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadBills}
            >
              Refresh
            </Button>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Bills
                  </Typography>
                  <Typography variant="h4">{bills.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Amount
                  </Typography>
                  <Typography variant="h4">{formatCurrency(bills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0))}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Tax
                  </Typography>
                  <Typography variant="h4">{formatCurrency(bills.reduce((sum, bill) => sum + (parseFloat(bill.tax) || 0), 0))}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={customerFilter}
                    label="Customer"
                    onChange={(e) => setCustomerFilter(e.target.value)}
                  >
                    <MenuItem value="">All Customers</MenuItem>
                    {customers.map(customer => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.firstName || customer.first_name} {customer.lastName || customer.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Bills Table */}
          {billsLoading ? (
            <Typography>Loading bills...</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bill Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Bill Date</TableCell>
                    <TableCell>Stay Start</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          {bills.length === 0
                            ? 'No bills found. Bills are created automatically when stays are closed.'
                            : 'No bills match the selected filters.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id} hover>
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium">
                            {bill.billNumber || bill.bill_number}
                          </Typography>
                        </TableCell>
                        <TableCell>{getBillCustomerName(bill)}</TableCell>
                        <TableCell>{formatDate(bill.billDate || bill.bill_date)}</TableCell>
                        <TableCell>{formatDate(bill.stayStartDate || bill.stay_start_date)}</TableCell>
                        <TableCell align="right">{formatCurrency(bill.subtotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(bill.tax)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold">
                            {formatCurrency(bill.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Bill">
                            <IconButton
                              size="small"
                              onClick={() => handleViewBill(bill)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print">
                            <IconButton
                              size="small"
                              onClick={() => handlePrintBill(bill)}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onClose={() => setShowExpenseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={expenseFormData.category}
                  label="Category"
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                >
                  {expenseCategories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount (€)"
                type="number"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={expenseFormData.notes}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveExpense} variant="contained" color="error">
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* Income Dialog */}
      <Dialog open={showIncomeDialog} onClose={() => setShowIncomeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Income</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={incomeFormData.description}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                required
                placeholder="e.g., Equipment sale, Service fee, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount (€)"
                type="number"
                value={incomeFormData.amount}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={incomeFormData.date}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={incomeFormData.notes}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIncomeDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveIncome} variant="contained" color="success">
            Save Income
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close the Day Dialog */}
      <Dialog 
        open={showCloseDayDialog} 
        onClose={() => setShowCloseDayDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Daily Financial Report - {selectedDate instanceof Date 
                ? selectedDate.toISOString().split('T')[0] 
                : selectedDate}
            </Typography>
            <IconButton onClick={() => setShowCloseDayDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '100%' }}>
          <iframe
            srcDoc={dailyReportHtml || generateDailyReportHTML()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: '600px'
            }}
            title="Daily Financial Report"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(dailyReportHtml || generateDailyReportHTML());
                printWindow.document.close();
                printWindow.print();
              }}
            >
              Print
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleStoreReport}
            >
              Store
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={handleEmailReport}
            >
              Share by Email
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* View Stored Report Dialog */}
      <Dialog
        open={viewReportDialogOpen}
        onClose={() => setViewReportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Daily Financial Report - {selectedReport?.date}
            </Typography>
            <IconButton onClick={() => setViewReportDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '100%' }}>
          {selectedReport && (
            <iframe
              srcDoc={selectedReport.html}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                minHeight: '600px'
              }}
              title="Stored Financial Report"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewReportDialogOpen(false)}>Close</Button>
          {selectedReport && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(selectedReport.html);
                printWindow.document.close();
                printWindow.print();
              }}
            >
              Print
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog
        open={viewBillDialogOpen}
        onClose={() => setViewBillDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Bill Details - {selectedBill?.billNumber || selectedBill?.bill_number}
        </DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Customer</Typography>
                  <Typography variant="body1">{getBillCustomerName(selectedBill)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Bill Date</Typography>
                  <Typography variant="body1">{formatDate(selectedBill.billDate || selectedBill.bill_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Stay Start</Typography>
                  <Typography variant="body1">{formatDate(selectedBill.stayStartDate || selectedBill.stay_start_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6">{formatCurrency(selectedBill.total)}</Typography>
                </Grid>
              </Grid>

              {/* Bill Items */}
              {selectedBill.billItems && selectedBill.billItems.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Bill Items</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedBill.billItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={item.type} size="small" />
                            </TableCell>
                            <TableCell>{item.description || item.name || item.diveSite || '-'}</TableCell>
                            <TableCell>{item.date ? formatDate(item.date) : '-'}</TableCell>
                            <TableCell align="right">{item.quantity || 1}</TableCell>
                            <TableCell align="right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Payment Split */}
              {(selectedBill.partnerPaidTotal > 0 || selectedBill.partner_paid_total > 0) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Partner Payment:</strong> {formatCurrency(selectedBill.partnerPaidTotal || selectedBill.partner_paid_total || 0)} 
                    {selectedBill.partnerTax || selectedBill.partner_tax > 0 ? ` (Tax: ${formatCurrency(selectedBill.partnerTax || selectedBill.partner_tax)})` : ''}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Customer Payment:</strong> {formatCurrency(selectedBill.customerPaidTotal || selectedBill.customer_paid_total || 0)}
                    {selectedBill.customerTax || selectedBill.customer_tax > 0 ? ` (Tax: ${formatCurrency(selectedBill.customerTax || selectedBill.customer_tax)})` : ''}
                  </Typography>
                </Alert>
              )}

              {/* Summary */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1">{formatCurrency(selectedBill.subtotal)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Tax ({taxName})</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1">{formatCurrency(selectedBill.tax)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{formatCurrency(selectedBill.total)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewBillDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => handlePrintBill(selectedBill)}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Financial;
