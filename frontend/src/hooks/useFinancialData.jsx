// All shared state, data loading, and business logic for the Financial
// page (daily summary, expenses/income, close-day reports, historical
// bills, quarterly tax declaration). Extracted from the former
// monolithic Financial.jsx (Phase 5.2) - its 4 tabs (plus the dialogs
// they open) all read and write this same shared state and several tabs'
// visible index shifts depending on isBikeRental, so like BoatPrep.jsx
// (and unlike Settings.jsx's independent tabs) this couldn't be split
// into fully self-contained per-tab components without duplicating this
// logic. Instead, this single hook centralizes it, and each tab/dialog
// component (see components/Financial/*.jsx) consumes the same call's
// return value.
//
// This is a pure "Extract Hook" refactor: every line of logic below is
// unchanged from the original component body, with one deliberate fix
// noted inline where an extraction-time verification pass caught it (see
// getExpenseCategories() below) - a pre-existing bug, not something this
// refactor introduced.
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import financialService from '../services/financialService';
import dataService from '../services/dataService';
import { useTranslation } from '../utils/languageContext';
import { useAuth, USER_ROLES } from '../utils/authContext';
import { hasDivingFeatures } from '../utils/locationTypes';

export default function useFinancialData() {
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

  const getExpenseCategories = () => [
    { value: 'gasoline', labelKey: 'financial.gasoline' },
    { value: 'tank_net', labelKey: 'financial.tankNet' },
    { value: 'glue', labelKey: 'financial.glue' },
    { value: 'equipment', labelKey: 'financial.equipment' },
    { value: 'maintenance', labelKey: 'financial.maintenance' },
    { value: 'other', labelKey: 'financial.other' }
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
                // Bug fix during Phase 5.2 extraction: was referencing an undeclared
                // `expenseCategories` variable (ReferenceError at runtime whenever
                // a closed-day report included expenses) - the intended value is
                // this function call, per its other use site in the dialog below.
                const categoryLabel = getExpenseCategories().find(c => c.value === expense.category)?.label || expense.category;
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
          <p>${[settings?.organisation?.name, settings?.organisation?.address].filter(Boolean).join(' - ') || 'Dive Center'}</p>
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
          <p>${[settings?.organisation?.name, settings?.organisation?.address].filter(Boolean).join(' - ') || 'Dive Center'}</p>
          <p><strong>Note:</strong> This is a summary document. Please verify all amounts before submitting to Hacienda/AEAT.</p>
        </div>
      </body>
      </html>
    `;
  };

  // Compute tax name from current location's pricing (location-specific)
  const taxName = currentLocation?.pricing?.tax?.tax_name || currentLocation?.settings?.pricing?.tax?.tax_name || 'IGIC';
  const taxRate = currentLocation?.pricing?.tax?.igic_rate || currentLocation?.settings?.pricing?.tax?.igic_rate || 0.07;

return {
    activeTab, bills, billsLoading, currentLocation, currentLocationId, currentUser, 
    customerFilter, customers, dailyReportHtml, endDate, expenseFormData, filterBills, 
    filteredBills, financialSummary, formatCurrency, formatDate, generateDailyReportHTML, 
    generateIgicDeclarationHTML, getBillCustomerName, getCustomerName, getExpenseCategories, 
    getQuarterDateRange, handleAddExpense, handleAddIncome, handleCloseDay, handleDateChange, 
    handleDeleteExpense, handleDeleteIncome, handleDownloadReport, handleEmailReport, 
    handlePrintBill, handleSaveExpense, handleSaveIncome, handleStoreReport, handleViewBill, 
    handleViewReport, igicDeclaration, igicLoading, incomeFormData, isAdmin, isBikeRental, 
    loadBills, loadCustomers, loadFinancialSummary, loadIgicDeclaration, loadLocations, 
    loadSettings, loadStoredReports, loading, locations, selectedBill, selectedDate, 
    selectedQuarter, selectedReport, selectedYear, setActiveTab, setBills, setBillsLoading, 
    setCurrentLocationId, setCustomerFilter, setCustomers, setDailyReportHtml, setEndDate, 
    setExpenseFormData, setFilteredBills, setFinancialSummary, setIgicDeclaration, 
    setIgicLoading, setIncomeFormData, setLoading, setLocations, setSelectedBill, 
    setSelectedDate, setSelectedQuarter, setSelectedReport, setSelectedYear, setSettings, 
    setShowCloseDayDialog, setShowExpenseDialog, setShowIncomeDialog, setStartDate, 
    setStoredReports, setViewBillDialogOpen, setViewReportDialogOpen, settings, 
    showCloseDayDialog, showExpenseDialog, showIncomeDialog, startDate, storedReports, t, 
    taxName, taxRate, viewBillDialogOpen, 
    viewReportDialogOpen
  };
}
