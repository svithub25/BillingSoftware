import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3, TrendingUp, Calendar, Package, IndianRupee, Users, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Search, X
} from 'lucide-react';
import PinProtected from './reusables/PinProtected';
import { Bar, Line } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip, 
  Legend 
);

const formatINR = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState(null);
  const isInitialMount = useRef(true);

  // Load data on initial mount only
  useEffect(() => {
    if (isInitialMount.current) {
      loadAnalyticsData();
      isInitialMount.current = false;
    }
  }, []); // Empty dependency array - runs once

  // Separate effect to reload when dates change (but not on initial mount)
  useEffect(() => {
    if (!isInitialMount.current) {
      loadAnalyticsData();
    }
  }, [startDate, endDate]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateRange = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      // Get comprehensive data
      const [sales, purchases, inventory, salesHistory, purchaseHistory] = await Promise.all([
        window.electronAPI.getFilteredSales(dateRange),
        window.electronAPI.getPurchaseHistory(),
        window.electronAPI.getInventory(),
        window.electronAPI.getSalesHistory(),
        window.electronAPI.getPurchaseHistory()
      ]);

      // Filter by date range
      const filteredSales = sales.filter(s => 
        s.sale_date >= dateRange.startDate && s.sale_date <= dateRange.endDate
      );
      const filteredPurchases = purchases.filter(p => 
        p.purchase_date >= dateRange.startDate && p.purchase_date <= dateRange.endDate
      );

      // Get detailed sale items for the period
      const saleItemsDetailed = [];
      for (const sale of filteredSales) {
        const saleDetails = await window.electronAPI.getSaleDetails(sale.id);
        if (saleDetails && saleDetails.items) {
          saleDetails.items.forEach(item => {
            const invItem = inventory.find(i => i.id === item.item_id);
            saleItemsDetailed.push({
              ...item,
              sale_date: sale.sale_date,
              bill_number: sale.bill_number,
              customer_name: sale.customer_name,
              category_name: invItem?.category_name || 'Uncategorized'
            });
          });
        }
      }

      // Get detailed purchase items for the period
      const purchaseItemsDetailed = [];
      for (const purchase of filteredPurchases) {
        const purchaseDetails = await window.electronAPI.getPurchaseDetails(purchase.id);
        if (purchaseDetails && purchaseDetails.items) {
          purchaseDetails.items.forEach(item => {
            const invItem = inventory.find(i => i.id === item.item_id);
            purchaseItemsDetailed.push({
              ...item,
              purchase_date: purchase.purchase_date,
              invoice_number: purchase.invoice_number,
              supplier_name: purchase.supplier_name,
              category_name: invItem?.category_name || 'Uncategorized'
            });
          });
        }
      }

      const data = processAnalytics(
        filteredSales, 
        filteredPurchases, 
        inventory, 
        saleItemsDetailed, 
        purchaseItemsDetailed
      );
      setAnalyticsData(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (sales, purchases, inventory, saleItems, purchaseItems) => {
    // Sales Analytics
    const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalOrders = sales.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Purchase Analytics
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPurchaseOrders = purchases.length;
    const avgPurchaseValue = totalPurchaseOrders > 0 ? totalPurchases / totalPurchaseOrders : 0;

    // Item-wise Sales Analysis
    const itemSalesMap = {};
    saleItems.forEach(item => {
      const itemId = item.item_id;
      if (!itemSalesMap[itemId]) {
        itemSalesMap[itemId] = {
          item_id: itemId,
          item_name: item.item_name,
          total_quantity: 0,
          total_revenue: 0,
          total_cost: 0,
          transactions: 0
        };
      }
      itemSalesMap[itemId].total_quantity += item.quantity;
      itemSalesMap[itemId].total_revenue += item.quantity * item.unit_price;
      itemSalesMap[itemId].total_cost += item.quantity * (item.salesman_rate || 0);
      itemSalesMap[itemId].transactions++;
    });

    // Item-wise Purchase Analysis
    const itemPurchaseMap = {};
    purchaseItems.forEach(item => {
      const itemId = item.item_id;
      if (!itemPurchaseMap[itemId]) {
        itemPurchaseMap[itemId] = {
          item_id: itemId,
          item_name: item.item_name,
          total_quantity: 0,
          total_cost: 0,
          avg_rate: 0,
          transactions: 0
        };
      }
      itemPurchaseMap[itemId].total_quantity += item.quantity;
      itemPurchaseMap[itemId].total_cost += item.quantity * item.unit_price;
      itemPurchaseMap[itemId].transactions++;
    });

    // Calculate average rates
    Object.values(itemPurchaseMap).forEach(item => {
      item.avg_rate = item.total_quantity > 0 ? item.total_cost / item.total_quantity : 0;
    });

    // Combine item analytics
    const itemAnalytics = {};
    Object.keys(itemSalesMap).forEach(itemId => {
      itemAnalytics[itemId] = {
        ...itemSalesMap[itemId],
        purchased_quantity: itemPurchaseMap[itemId]?.total_quantity || 0,
        purchase_cost: itemPurchaseMap[itemId]?.total_cost || 0,
        purchase_transactions: itemPurchaseMap[itemId]?.transactions || 0,
        gross_profit: itemSalesMap[itemId].total_revenue - (itemPurchaseMap[itemId]?.total_cost || 0)
      };
    });

    // Add items that were only purchased (not sold)
    Object.keys(itemPurchaseMap).forEach(itemId => {
      if (!itemAnalytics[itemId]) {
        itemAnalytics[itemId] = {
          item_id: itemId,
          item_name: itemPurchaseMap[itemId].item_name,
          total_quantity: 0,
          total_revenue: 0,
          transactions: 0,
          purchased_quantity: itemPurchaseMap[itemId].total_quantity,
          purchase_cost: itemPurchaseMap[itemId].total_cost,
          purchase_transactions: itemPurchaseMap[itemId].transactions,
          gross_profit: 0
        };
      }
    });

    // Inventory Analytics
    const totalInventoryValue = inventory.reduce((sum, i) => 
      sum + (i.current_stock * i.customer_rate), 0
    );
    const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock).length;
    const outOfStockItems = inventory.filter(i => i.current_stock === 0).length;

    // Vendor Analysis
    const vendorStats = {};
    purchases.forEach(purchase => {
      const vendor = purchase.supplier_name || 'Unknown';
      if (!vendorStats[vendor]) {
        vendorStats[vendor] = { count: 0, total: 0, name: vendor };
      }
      vendorStats[vendor].count++;
      vendorStats[vendor].total += purchase.total_amount || 0;
    });

    // Customer Analysis
    const customerStats = {};
    sales.forEach(sale => {
      const customer = sale.customer_name || 'Walk-in';
      if (!customerStats[customer]) {
        customerStats[customer] = { 
          count: 0, 
          total: 0, 
          name: customer,
          totalItems: 0,
          avgOrderValue: 0,
          transactions: []
        };
      }
      customerStats[customer].count++;
      customerStats[customer].total += sale.total_amount || 0;
      customerStats[customer].transactions.push({
        date: sale.sale_date,
        billNumber: sale.bill_number,
        amount: sale.total_amount
      });
    });

    Object.values(customerStats).forEach(customer => {
      customer.avgOrderValue = customer.count > 0 ? customer.total / customer.count : 0;
    });

    saleItems.forEach(item => {
      const customer = item.customer_name || 'Walk-in';
      if (customerStats[customer]) {
        customerStats[customer].totalItems += item.quantity;
      }
    });

    // Category Analysis
    const categoryStats = {};
    
    inventory.forEach(item => {
      const category = item.category_name || 'Uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category: category,
          totalItems: 0,
          totalStock: 0,
          stockValue: 0,
          itemsSold: 0,
          salesRevenue: 0,
          itemsPurchased: 0,
          purchaseCost: 0,
          items: []
        };
      }
      categoryStats[category].totalItems++;
      categoryStats[category].totalStock += item.current_stock;
      categoryStats[category].stockValue += item.current_stock * item.customer_rate;
      categoryStats[category].items.push(item.name);
    });

    saleItems.forEach(item => {
      const category = item.category_name || 'Uncategorized';
      
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category: category,
          totalItems: 0,
          totalStock: 0,
          stockValue: 0,
          itemsSold: 0,
          salesRevenue: 0,
          itemsPurchased: 0,
          purchaseCost: 0,
          items: []
        };
      }
      
      categoryStats[category].itemsSold += item.quantity;
      categoryStats[category].salesRevenue += item.quantity * item.unit_price;
    });

    purchaseItems.forEach(item => {
      const category = item.category_name || 'Uncategorized';
      
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category: category,
          totalItems: 0,
          totalStock: 0,
          stockValue: 0,
          itemsSold: 0,
          salesRevenue: 0,
          itemsPurchased: 0,
          purchaseCost: 0,
          items: []
        };
      }
      
      categoryStats[category].itemsPurchased += item.quantity;
      categoryStats[category].purchaseCost += item.quantity * item.unit_price;
    });

    // Daily Trends Analysis
    const dailyData = {};
    
    sales.forEach(sale => {
      const date = sale.sale_date;
      if (!dailyData[date]) {
        dailyData[date] = { date, sales: 0, purchases: 0 };
      }
      dailyData[date].sales += sale.total_amount || 0;
    });

    purchases.forEach(purchase => {
      const date = purchase.purchase_date;
      if (!dailyData[date]) {
        dailyData[date] = { date, sales: 0, purchases: 0 };
      }
      dailyData[date].purchases += purchase.total_amount || 0;
    });

    return {
      summary: {
        totalSales,
        totalOrders,
        avgOrderValue,
        totalPurchases,
        totalPurchaseOrders,
        avgPurchaseValue,
        grossProfit: totalSales - totalPurchases,
        profitMargin: totalSales > 0 ? ((totalSales - totalPurchases) / totalSales * 100).toFixed(2) : 0,
        totalInventoryValue,
        lowStockItems,
        outOfStockItems,
        totalItems: inventory.length,
        totalItemsSold: Object.values(itemSalesMap).reduce((sum, i) => sum + i.total_quantity, 0),
        totalItemsPurchased: Object.values(itemPurchaseMap).reduce((sum, i) => sum + i.total_quantity, 0),
        totalCustomers: Object.keys(customerStats).length,
        totalCategories: Object.keys(categoryStats).length
      },
      inventory: inventory.map(item => ({
        ...item,
        stockValue: item.current_stock * item.customer_rate,
        purchaseValue: item.current_stock * item.purchase_rate
      })),
      itemAnalytics: Object.values(itemAnalytics).sort((a, b) => b.total_revenue - a.total_revenue),
      topSellingItems: Object.values(itemAnalytics)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10),
      topPurchasedItems: Object.values(itemPurchaseMap)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10),
      vendors: Object.values(vendorStats).sort((a, b) => b.total - a.total),
      customers: Object.values(customerStats).sort((a, b) => b.total - a.total),
      categories: Object.values(categoryStats).sort((a, b) => b.salesRevenue - a.salesRevenue),
      dailyTrends: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      sales,
      purchases,
      saleItems,
      purchaseItems
    };
  };

  const CustomDateRangePicker = () => (
    <div className="relative">
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Calendar className="w-5 h-5 text-blue-500" />
        <span className="font-medium">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </span>
      </button>

      {showCalendar && (
        <div className="absolute top-full mt-2 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Select Date Range</h3>
            <button
              onClick={() => setShowCalendar(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate}
                inline
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                inline
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <button
              onClick={() => {
                const today = new Date();
                setStartDate(today);
                setEndDate(today);
                setShowCalendar(false);
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
                setStartDate(start);
                setEndDate(end);
                setShowCalendar(false);
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                setStartDate(start);
                setEndDate(end);
                setShowCalendar(false);
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getFullYear(), end.getMonth(), 1);
                setStartDate(start);
                setEndDate(end);
                setShowCalendar(false);
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              This Month
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      // <PinProtected message="This module is protected and requires PIN verification to access." modulename="Analytics">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading comprehensive analytics...</span>
        </div>
      // </PinProtected>
    );
  }

  if (error || !analyticsData) {
    return (
      // <PinProtected message="This module is protected and requires PIN verification to access." modulename="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || 'No analytics available'}</p>
            <button
              onClick={loadAnalyticsData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      // </PinProtected>
    );
  }

  const { summary, itemAnalytics, topSellingItems, topPurchasedItems, vendors, customers, categories, dailyTrends, inventory: inventoryData } = analyticsData;

  return (
    // <PinProtected message="This module is protected and requires PIN verification to access." modulename="Analytics">
      <div className="space-y-6">
        {/* Header with Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center  gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
            <p className="text-gray-600">Comprehensive insights and analytics for your business</p>
          </div>
          <CustomDateRangePicker />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-900">₹{formatINR(summary.totalSales)}</p>
                <p className="text-xs text-green-600 mt-1">{summary.totalOrders} orders</p>
              </div>
              <IndianRupee className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Items Sold</p>
                <p className="text-2xl font-bold text-blue-900">{summary.totalItemsSold}</p>
                <p className="text-xs text-blue-600 mt-1">Total quantity</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Items Purchased</p>
                <p className="text-2xl font-bold text-orange-900">{summary.totalItemsPurchased}</p>
                <p className="text-xs text-orange-600 mt-1">Total quantity</p>
              </div>
              <Package className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>

          {/* <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Gross Profit</p>
                <p className="text-2xl font-bold text-purple-900">₹{formatINR(summary.grossProfit)}</p>
                <p className="text-xs text-purple-600 mt-1">{summary.profitMargin}% margin</p>
              </div>
              <ArrowUpRight className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div> */}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 px-6 overflow-x-auto">
              {[{
                id: 'overview', name: 'Overview' },
                { id: 'items', name: 'Item Analysis' },
                { id: 'customers', name: 'Customer Analysis' },
                { id: 'categories', name: 'Category Analysis' },
                { id: 'sales', name: 'Sales Details' },
                { id: 'purchases', name: 'Purchase Details' }
              ].map(tab => (
                <button
                  key={tab.id} 
                  onClick={() => setActiveView(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview */}
            {activeView === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Selling Items */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Top 10 Selling Items by Quantity</h3>
                    <Bar
                      data={{
                        labels: topSellingItems.map(i => i.item_name),
                        datasets: [{
                          label: 'Quantity Sold',
                          data: topSellingItems.map(i => i.total_quantity),
                          backgroundColor: 'rgba(34, 197, 94, 0.7)'
                        }]
                      }}
                      options={{ 
                        responsive: true,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>

                  {/* Top Purchased Items */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Top 10 Purchased Items by Quantity</h3>
                    <Bar
                      data={{
                        labels: topPurchasedItems.map(i => i.item_name),
                        datasets: [{
                          label: 'Quantity Purchased',
                          data: topPurchasedItems.map(i => i.total_quantity),
                          backgroundColor: 'rgba(239, 68, 68, 0.7)'
                        }]
                      }}
                      options={{ 
                        responsive: true,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </div>

                {/* Daily Trends */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Sales vs Purchase Trend</h3>
                  <Line
                    data={{
                      labels: dailyTrends.map(d => new Date(d.date).toLocaleDateString()),
                      datasets: [
                        {
                          label: 'Sales (₹)',
                          data: dailyTrends.map(d => d.sales || 0),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          tension: 0.3
                        },
                        {
                          label: 'Purchases (₹)',
                          data: dailyTrends.map(d => d.purchases || 0),
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          tension: 0.3
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: 'top' } }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Item Analysis */}
            {activeView === 'items' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Complete Item-wise Analysis</h2>
                
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Purchased</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Cost</th>
                          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Profit</th> */}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {itemAnalytics.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                            <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.total_quantity}</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-semibold">₹{formatINR(item.total_revenue)}</td>
                            <td className="px-6 py-4 text-sm text-orange-600 font-semibold">{item.purchased_quantity}</td>
                            <td className="px-6 py-4 text-sm text-red-600 font-semibold">₹{formatINR(item.purchase_cost)}</td>
                            {/* <td className="px-6 py-4 text-sm font-bold text-purple-600">₹{formatINR(item.gross_profit)}</td> */}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="text-xs">
                                <div>Sales: {item.transactions}</div>
                                <div>Purchase: {item.purchase_transactions}</div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Details */}
            {activeView === 'sales' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Sales Transaction Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <p className="text-sm font-medium text-green-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900">₹{formatINR(summary.totalSales)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-medium text-blue-600">Total Orders</p>
                    <p className="text-3xl font-bold text-blue-900">{summary.totalOrders}</p>
                  </div>
                  {/* <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <p className="text-sm font-medium text-purple-600">Avg Order Value</p>
                    <p className="text-3xl font-bold text-purple-900">₹{formatINR(summary.avgOrderValue)}</p>
                  </div> */}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold">All Sales Transactions</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {analyticsData.sales.map((sale, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(sale.sale_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.bill_number}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{sale.customer_name || 'Walk-in'}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600">₹{formatINR(sale.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Details */}
            {activeView === 'purchases' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Purchase Transaction Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <p className="text-sm font-medium text-red-600">Total Purchases</p>
                    <p className="text-3xl font-bold text-red-900">₹{formatINR(summary.totalPurchases)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <p className="text-sm font-medium text-orange-600">Purchase Orders</p>
                    <p className="text-3xl font-bold text-orange-900">{summary.totalPurchaseOrders}</p>
                  </div>
                  {/* <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-600">Avg Purchase</p>
                    <p className="text-3xl font-bold text-yellow-900">₹{formatINR(summary.avgPurchaseValue)}</p>
                  </div> */}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold">All Purchase Transactions</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {analyticsData.purchases.map((purchase, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{purchase.invoice_number}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{purchase.supplier_name || 'Unknown'}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-red-600">₹{formatINR(purchase.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div> 
                </div>
              </div>
            )}

            {/* Customer Analysis */}
            {activeView === 'customers' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Customer-wise Analysis</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-medium text-blue-600">Total Customers</p>
                    <p className="text-3xl font-bold text-blue-900">{summary.totalCustomers}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <p className="text-sm font-medium text-green-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900">₹{formatINR(summary.totalSales)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <p className="text-sm font-medium text-purple-600">Avg per Customer</p>
                    <p className="text-3xl font-bold text-purple-900">
                      ₹{formatINR(summary.totalCustomers > 0 ? summary.totalSales / summary.totalCustomers : 0)}
                    </p>
                  </div>
                </div>

                {/* Top Customers Chart */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Top 10 Customers by Revenue</h3>
                  <Bar
                    data={{
                      labels: customers.slice(0, 10).map(c => c.name),
                      datasets: [{
                        label: 'Total Revenue (₹)',
                        data: customers.slice(0, 10).map(c => c.total),
                        backgroundColor: 'rgba(59, 130, 246, 0.7)'
                      }]
                    }}
                    options={{ 
                      responsive: true,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>

                {/* Customer Details Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold">Detailed Customer Statistics</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Purchased</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {customers.map((customer, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                            <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{customer.count}</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-semibold">₹{formatINR(customer.total)}</td>
                            <td className="px-6 py-4 text-sm text-orange-600 font-semibold">{customer.totalItems}</td>
                            <td className="px-6 py-4 text-sm text-purple-600 font-semibold">₹{formatINR(customer.avgOrderValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Category Analysis */}
            {activeView === 'categories' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Category-wise Analysis</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                    <p className="text-sm font-medium text-indigo-600">Total Categories</p>
                    <p className="text-3xl font-bold text-indigo-900">{summary.totalCategories}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <p className="text-sm font-medium text-green-600">Total Stock Value</p>
                    <p className="text-3xl font-bold text-green-900">₹{formatINR(summary.totalInventoryValue)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-medium text-blue-600">Total Items</p>
                    <p className="text-3xl font-bold text-blue-900">{summary.totalItems}</p>
                  </div>
                </div>

                {/* Category Sales Chart */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Category-wise Sales Revenue</h3>
                  <Bar
                    data={{
                      labels: categories.map(c => c.category),
                      datasets: [{
                        label: 'Sales Revenue (₹)',
                        data: categories.map(c => c.salesRevenue),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)'
                      }]
                    }}
                    options={{ 
                      responsive: true,
                       indexAxis: 'y',
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>

                {/* Category Details Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold">Detailed Category Statistics</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Items</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Sold</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Purchased</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {categories.map((category, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.category}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{category.totalItems}</td>
                            <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{category.totalStock}</td>
                            <td className="px-6 py-4 text-sm text-indigo-600 font-semibold">₹{formatINR(category.stockValue)}</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-semibold">{category.itemsSold}</td>
                            <td className="px-6 py-4 text-sm text-green-700 font-bold">₹{formatINR(category.salesRevenue)}</td>
                            <td className="px-6 py-4 text-sm text-orange-600 font-semibold">{category.itemsPurchased}</td>
                            <td className="px-6 py-4 text-sm text-red-600 font-semibold">₹{formatINR(category.purchaseCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div> 
    //  </PinProtected>
    );
};

export default Analytics;