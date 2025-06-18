import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, Filter, Download, TrendingUp, DollarSign, Users, CreditCard } from 'lucide-react';
import { supabase } from '../../api';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';

type SummaryPeriod = 'daily' | 'weekly' | 'monthly';
type ReportType = 'overview' | 'route' | 'bus' | 'clerk' | 'payment';

const Reconciliation: React.FC = () => {
  const { darkMode, currentUser } = useStore();
  const [period, setPeriod] = useState<SummaryPeriod>('daily');
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedBus, setSelectedBus] = useState<string>('all');
  const [selectedClerk, setSelectedClerk] = useState<string>('all');
  
  const [summary, setSummary] = useState<any>({
    tickets: { count: 0, amount: 0 },
    parcels: { count: 0, amount: 0 },
    expenses: { count: 0, amount: 0 },
    netIncome: 0,
    paymentMethods: { cash: 0, mpesa: 0 },
    routeBreakdown: [],
    busBreakdown: [],
    clerkBreakdown: [],
    outstandingPayments: []
  });

  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [clerks, setClerks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, [period, selectedDate, reportType, selectedRoute, selectedBus, selectedClerk]);

  const getDateRange = () => {
    const date = new Date(selectedDate);
    switch (period) {
      case 'weekly':
        return {
          start: format(startOfWeek(date), 'yyyy-MM-dd'),
          end: format(endOfWeek(date), 'yyyy-MM-dd')
        };
      case 'monthly':
        return {
          start: format(startOfMonth(date), 'yyyy-MM-dd'),
          end: format(endOfMonth(date), 'yyyy-MM-dd')
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate
        };
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch routes
      const { data: routesData } = await supabase
        .from('routes')
        .select('id, origin, destination')
        .order('origin');
      setRoutes(routesData || []);

      // Fetch buses
      const { data: busesData } = await supabase
        .from('buses')
        .select('id, name, registration_number')
        .order('name');
      setBuses(busesData || []);

      // Fetch clerks (users who have made bookings)
      const { data: clerksData } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name');
      setClerks(clerksData || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchData = async () => {
    try {
      const { start, end } = getDateRange();

      // Build filters
      let ticketQuery = supabase
        .from('bookings')
        .select(`
          price, currency, payment_method, booked_by,
          route:routes(origin, destination),
          bus:buses(name),
          booked_by_profile:profiles!bookings_booked_by_fkey(name)
        `)
        .gte('departure_date', start)
        .lte('departure_date', end)
        .eq('is_cancelled', false);

      let parcelQuery = supabase
        .from('parcels')
        .select(`
          price, currency, payment_method, booked_by,
          route:routes(origin, destination),
          bus:buses(name),
          booked_by_profile:profiles!parcels_booked_by_fkey(name)
        `)
        .gte('departure_date', start)
        .lte('departure_date', end)
        .eq('is_cancelled', false);

      // Apply filters
      if (selectedRoute !== 'all') {
        ticketQuery = ticketQuery.eq('route_id', selectedRoute);
        parcelQuery = parcelQuery.eq('route_id', selectedRoute);
      }

      if (selectedBus !== 'all') {
        ticketQuery = ticketQuery.eq('bus_id', selectedBus);
        parcelQuery = parcelQuery.eq('bus_id', selectedBus);
      }

      if (selectedClerk !== 'all') {
        ticketQuery = ticketQuery.eq('booked_by', selectedClerk);
        parcelQuery = parcelQuery.eq('booked_by', selectedClerk);
      }

      const [ticketsResult, parcelsResult, expensesResult] = await Promise.all([
        ticketQuery,
        parcelQuery,
        supabase
          .from('expenses')
          .select('amount, currency')
          .gte('date', start)
          .lte('date', end)
      ]);

      const tickets = ticketsResult.data || [];
      const parcels = parcelsResult.data || [];
      const expenses = expensesResult.data || [];

      // Calculate totals
      const ticketTotal = tickets.reduce((sum, t) => sum + Number(t.price), 0);
      const parcelTotal = parcels.reduce((sum, p) => sum + Number(p.price), 0);
      const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Payment method breakdown
      const allBookings = [...tickets, ...parcels];
      const paymentMethods = allBookings.reduce((acc, booking) => {
        acc[booking.payment_method] = (acc[booking.payment_method] || 0) + Number(booking.price);
        return acc;
      }, { cash: 0, mpesa: 0 });

      // Route breakdown
      const routeBreakdown = allBookings.reduce((acc, booking) => {
        const routeName = `${booking.route?.origin} - ${booking.route?.destination}`;
        const existing = acc.find(r => r.route === routeName);
        if (existing) {
          existing.amount += Number(booking.price);
          existing.count += 1;
        } else {
          acc.push({
            route: routeName,
            amount: Number(booking.price),
            count: 1
          });
        }
        return acc;
      }, []);

      // Bus breakdown
      const busBreakdown = allBookings.reduce((acc, booking) => {
        const busName = booking.bus?.name || 'Unassigned';
        const existing = acc.find(b => b.bus === busName);
        if (existing) {
          existing.amount += Number(booking.price);
          existing.count += 1;
        } else {
          acc.push({
            bus: busName,
            amount: Number(booking.price),
            count: 1
          });
        }
        return acc;
      }, []);

      // Clerk breakdown
      const clerkBreakdown = allBookings.reduce((acc, booking) => {
        const clerkName = booking.booked_by_profile?.name || 'Unknown';
        const existing = acc.find(c => c.clerk === clerkName);
        if (existing) {
          existing.amount += Number(booking.price);
          existing.count += 1;
        } else {
          acc.push({
            clerk: clerkName,
            amount: Number(booking.price),
            count: 1
          });
        }
        return acc;
      }, []);

      // Outstanding payments (for demonstration - you might want to add a separate table for this)
      const outstandingPayments = [
        { customer: 'John Doe', amount: 5000, currency: 'KES', dueDate: '2024-01-15', type: 'Corporate Booking' },
        { customer: 'ABC Company', amount: 15000, currency: 'KES', dueDate: '2024-01-20', type: 'Monthly Contract' }
      ];

      setSummary({
        tickets: {
          count: tickets.length,
          amount: ticketTotal
        },
        parcels: {
          count: parcels.length,
          amount: parcelTotal
        },
        expenses: {
          count: expenses.length,
          amount: expenseTotal
        },
        netIncome: ticketTotal + parcelTotal - expenseTotal,
        paymentMethods,
        routeBreakdown: routeBreakdown.sort((a, b) => b.amount - a.amount),
        busBreakdown: busBreakdown.sort((a, b) => b.amount - a.amount),
        clerkBreakdown: clerkBreakdown.sort((a, b) => b.amount - a.amount),
        outstandingPayments
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load summary data');
    }
  };

  const generateReport = async () => {
    try {
      const doc = new jsPDF();
      const { start, end } = getDateRange();

      // Add title
      doc.setFontSize(16);
      doc.text('Financial Analytics Report', 105, 20, { align: 'center' });

      // Add period and filters
      doc.setFontSize(12);
      doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 20, 35);
      doc.text(`Date Range: ${format(new Date(start), 'MMM d, yyyy')} - ${format(new Date(end), 'MMM d, yyyy')}`, 20, 45);
      
      if (selectedRoute !== 'all') {
        const route = routes.find(r => r.id === selectedRoute);
        doc.text(`Route: ${route?.origin} - ${route?.destination}`, 20, 55);
      }

      let y = 70;

      // Summary section
      doc.setFontSize(14);
      doc.text('Revenue Summary', 20, y);
      y += 15;

      doc.setFontSize(10);
      doc.text(`Ticket Sales: KES ${summary.tickets.amount.toFixed(2)} (${summary.tickets.count} bookings)`, 25, y);
      y += 10;
      doc.text(`Parcel Bookings: KES ${summary.parcels.amount.toFixed(2)} (${summary.parcels.count} bookings)`, 25, y);
      y += 10;
      doc.text(`Total Revenue: KES ${(summary.tickets.amount + summary.parcels.amount).toFixed(2)}`, 25, y);
      y += 10;
      doc.text(`Total Expenses: KES ${summary.expenses.amount.toFixed(2)}`, 25, y);
      y += 10;
      doc.text(`Net Income: KES ${summary.netIncome.toFixed(2)}`, 25, y);
      y += 20;

      // Payment methods
      doc.setFontSize(14);
      doc.text('Payment Method Breakdown', 20, y);
      y += 15;

      doc.setFontSize(10);
      doc.text(`Cash: KES ${summary.paymentMethods.cash.toFixed(2)}`, 25, y);
      y += 10;
      doc.text(`M-Pesa: KES ${summary.paymentMethods.mpesa.toFixed(2)}`, 25, y);
      y += 20;

      // Route breakdown (if showing route analysis)
      if (reportType === 'route' || reportType === 'overview') {
        doc.setFontSize(14);
        doc.text('Top Routes by Revenue', 20, y);
        y += 15;

        summary.routeBreakdown.slice(0, 5).forEach((route: any) => {
          doc.setFontSize(10);
          doc.text(`${route.route}: KES ${route.amount.toFixed(2)} (${route.count} bookings)`, 25, y);
          y += 10;
        });
        y += 10;
      }

      // Bus breakdown (if showing bus analysis)
      if (reportType === 'bus' || reportType === 'overview') {
        doc.setFontSize(14);
        doc.text('Top Buses by Revenue', 20, y);
        y += 15;

        summary.busBreakdown.slice(0, 5).forEach((bus: any) => {
          doc.setFontSize(10);
          doc.text(`${bus.bus}: KES ${bus.amount.toFixed(2)} (${bus.count} bookings)`, 25, y);
          y += 10;
        });
        y += 10;
      }

      // Clerk breakdown (if showing clerk analysis)
      if (reportType === 'clerk' || reportType === 'overview') {
        doc.setFontSize(14);
        doc.text('Top Booking Clerks by Revenue', 20, y);
        y += 15;

        summary.clerkBreakdown.slice(0, 5).forEach((clerk: any) => {
          doc.setFontSize(10);
          doc.text(`${clerk.clerk}: KES ${clerk.amount.toFixed(2)} (${clerk.count} bookings)`, 25, y);
          y += 10;
        });
      }

      // Add footer
      doc.setFontSize(8);
      doc.text(`Generated on: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, 280);
      doc.text('GRAND BUS', 105, 280, { align: 'center' });

      // Save the PDF
      doc.save(`financial-analytics-${reportType}-${period}-${start}.pdf`);
      
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-300">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Analytics & Reconciliation</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Comprehensive financial reporting and analytics
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={generateReport}
          className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download size={18} className="mr-2" />
          <span>Generate Report</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="overview">Overview</option>
              <option value="route">By Route</option>
              <option value="bus">By Bus</option>
              <option value="clerk">By Clerk</option>
              <option value="payment">Payment Methods</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as SummaryPeriod)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Route</label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.origin} - {route.destination}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bus</label>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Buses</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.name} ({bus.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Booking Clerk</label>
            <select
              value={selectedClerk}
              onChange={(e) => setSelectedClerk(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Clerks</option>
              {clerks.map((clerk) => (
                <option key={clerk.id} value={clerk.id}>
                  {clerk.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-2">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-500">
                KES {(summary.tickets.amount + summary.parcels.amount).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>

        {/* Expenses Card */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-2">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-500">
                KES {summary.expenses.amount.toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-red-500" size={32} />
          </div>
        </div>

        {/* Net Income Card */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-2">Net Income</h3>
              <p className={`text-2xl font-bold ${
                summary.netIncome >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                KES {summary.netIncome.toFixed(2)}
              </p>
            </div>
            <TrendingUp className={summary.netIncome >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
          </div>
        </div>

        {/* Bookings Card */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-2">Total Bookings</h3>
              <p className="text-2xl font-bold text-blue-500">
                {summary.tickets.count + summary.parcels.count}
              </p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
      </div>

      {/* Payment Methods Analytics */}
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <CreditCard className="mr-2" size={20} />
          Payment Method Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Cash Payments</span>
              <span className="font-bold">KES {summary.paymentMethods.cash.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ 
                  width: `${(summary.paymentMethods.cash / (summary.paymentMethods.cash + summary.paymentMethods.mpesa)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>M-Pesa Payments</span>
              <span className="font-bold">KES {summary.paymentMethods.mpesa.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ 
                  width: `${(summary.paymentMethods.mpesa / (summary.paymentMethods.cash + summary.paymentMethods.mpesa)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Breakdown */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <h3 className="text-lg font-medium mb-4">Top Routes by Revenue</h3>
          <div className="space-y-3">
            {summary.routeBreakdown.slice(0, 5).map((route: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{route.route}</p>
                  <p className="text-xs text-gray-500">{route.count} bookings</p>
                </div>
                <span className="font-bold">KES {route.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bus Breakdown */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <h3 className="text-lg font-medium mb-4">Top Buses by Revenue</h3>
          <div className="space-y-3">
            {summary.busBreakdown.slice(0, 5).map((bus: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{bus.bus}</p>
                  <p className="text-xs text-gray-500">{bus.count} bookings</p>
                </div>
                <span className="font-bold">KES {bus.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clerk Breakdown */}
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <h3 className="text-lg font-medium mb-4">Top Clerks by Revenue</h3>
          <div className="space-y-3">
            {summary.clerkBreakdown.slice(0, 5).map((clerk: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{clerk.clerk}</p>
                  <p className="text-xs text-gray-500">{clerk.count} bookings</p>
                </div>
                <span className="font-bold">KES {clerk.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outstanding Payments */}
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <h3 className="text-lg font-medium mb-4">Outstanding Payments & Debt Management</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {summary.outstandingPayments.map((payment: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(payment.dueDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
              {summary.outstandingPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No outstanding payments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reconciliation;