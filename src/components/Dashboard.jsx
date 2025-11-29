import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3,
  Calendar,
  RefreshCw,
  Building2,
  Keyboard
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await window.electronAPI?.getDashboardData() 
      setDashboardData(data); 
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const shortcuts = [
    { key: 'ESC', description: 'Toggle Sidebar (Open/Close)' },
    { key: 'Ctrl + D', description: 'Go to Dashboard' },
    { key: 'Ctrl + U', description: 'Go to Company' },
    { key: 'Ctrl + I', description: 'Go to Inventory' },
    { key: 'Ctrl + P', description: 'Go to Purchase' },
    { key: 'Ctrl + O', description: 'Go to Purchase Order' },
    { key: 'Ctrl + B', description: 'Go to Billing Module' },
    { key: 'Ctrl + G', description: 'Go to Godown/Branch' },
    { key: 'Ctrl + H', description: 'View Sales History' },
    { key: 'Ctrl + S', description: 'View Salesman Commission' },
    { key: 'Ctrl + L', description: 'Open Ledger' },
    { key: 'Ctrl + Y', description: 'Open Analytics Dashboard' },
    { key: 'Ctrl + E', description: 'Go to Export Section' },
    { key: 'Ctrl + N', description: 'Open Admin Panel' },
    { key: 'Ctrl + K', description: 'Open Banking' },
    { key: 'Tab', description: 'Navigate Between Form Fields' },
    { key: 'Enter', description: 'Submit Form / Confirm Action' },
    { key: 'Delete', description: 'Delete Selected Item' },
    { key: 'Arrow Keys', description: 'Navigate in Tables / Dropdowns' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Items',
      value: dashboardData?.totalItems || 0,
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      name: 'Low Stock Items',
      value: dashboardData?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Company Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div> 
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
        </div>
      </div> 

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shortcuts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keyboard Shortcuts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
            <Keyboard className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="space-y-2 flex-1">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-3 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm whitespace-nowrap">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Use these shortcuts to navigate faster and boost your productivity!
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          
          {dashboardData?.lowStockItems?.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {dashboardData.lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {item.current_stock} / {item.minimum_stock}
                    </p>
                    <p className="text-xs text-gray-500">Current / Min</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">All items are well stocked!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;