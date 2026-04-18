import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';

const ProfitAndLoss = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: (() => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed

      // If current month is Jan-Mar (0-2), financial year started last year
      // If current month is Apr-Dec (3-11), financial year started this year
      const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
      return `${fyStartYear}-04-01`; // April 1st in YYYY-MM-DD format
    })(),
    endDate: new Date().toISOString().split('T')[0]
  });
  useEffect(() => {
    loadProfitAndLoss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadProfitAndLoss = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.getProfitAndLoss(filters);
      console.log('P&L Data:', response);
      setData(response);
    } catch (error) {
      console.error('Error loading P&L:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    console.log('Export to PDF');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const revenue = data?.revenue || 0;
  const cogs = data?.cogs || 0;
  const grossProfit = data?.grossProfit || 0;
  const expenses = data?.expenses || 0;
  const otherIncome = data?.otherIncome || 0;
  const netProfit = data?.netProfit || 0;
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0;
  const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>  <button
          onClick={exportToPDF}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </button>  </div> */}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Gross Profit</p>
              <p className="text-2xl font-bold text-green-900 mt-1">₹{grossProfit.toLocaleString('en-IN')}</p>
              <p className="text-xs text-green-600 mt-1">{grossMargin}% margin</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-sm border p-4 ${netProfit >= 0
            ? 'from-blue-50 to-blue-100 border-blue-200'
            : 'from-red-50 to-red-100 border-red-200'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                Net Profit
              </p>
              <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                ₹{netProfit.toLocaleString('en-IN')}
              </p>
              <p className={`text-xs mt-1 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netMargin}% margin
              </p>
            </div>
            <div className={`p-3 rounded-lg ${netProfit >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Total Expenses</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">₹{expenses.toLocaleString('en-IN')}</p>
              <p className="text-xs text-orange-600 mt-1">Operating costs</p>
            </div>
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed P&L Statement */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Profit & Loss Statement
          </h3>
          {/* <p className="text-sm text-gray-600">
            {new Date(filters.startDate).toLocaleDateString('en-IN')} to {new Date(filters.endDate).toLocaleDateString('en-IN')}
          </p> */}
        </div>

        <div className="p-6">
          {/* Revenue Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center py-3 border-b-2 border-gray-900">
              <span className="text-lg font-bold text-gray-900">REVENUE (Sales)</span>
              <span className="text-lg font-bold text-green-600">₹{revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="mb-6">
            <div className="py-2 mb-2">
              <span className="font-semibold text-gray-700">Cost of Goods Sold (COGS)</span>
            </div>

            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Opening Stock</span>
                <span className="text-gray-900">₹{(data?.openingStock || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Add: Purchases</span>
                <span className="text-gray-900">₹{(data?.purchases || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Less: Closing Stock</span>
                <span className="text-gray-900">(₹{(data?.closingStock || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })})</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-gray-300 mt-2">
              <span className="font-semibold text-gray-700">Total COGS</span>
              <span className="font-semibold text-red-600">₹{cogs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-300 bg-green-50 px-4 rounded mt-2">
              <span className="font-bold text-gray-900">GROSS PROFIT</span>
              <span className="font-bold text-green-600">₹{grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="mb-6">
            <div className="py-2 mb-2">
              <span className="font-semibold text-gray-700">Operating Expenses</span>
            </div>

            {data?.expenseCategories && data.expenseCategories.length > 0 ? (
              data.expenseCategories.map((category, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 pl-4">
                  <span className="text-gray-600">{category.name}</span>
                  <span className="text-gray-900">₹{(category.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              ))
            ) : (
              <div className="py-2 pl-4 text-gray-500 text-sm">No expenses recorded</div>
            )}

            <div className="flex justify-between items-center py-2 border-t border-gray-300 mt-2">
              <span className="font-semibold text-gray-700">Total Operating Expenses</span>
              <span className="font-semibold text-red-600">₹{expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Other Income */}
          {otherIncome > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-gray-700">Other Income</span>
                <span className="font-semibold text-green-600">₹{otherIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Net Profit */}
          <div className={`flex justify-between items-center py-4 px-4 rounded ${netProfit >= 0 ? 'bg-blue-50 border-2 border-blue-600' : 'bg-red-50 border-2 border-red-600'
            }`}>
            <span className="text-xl font-bold text-gray-900">NET PROFIT</span>
            <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ₹{netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Summary Note */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
            <p><strong>Note:</strong> Net Profit = Gross Profit - Operating Expenses + Other Income</p>
            <p className="mt-1">COGS calculated using FIFO method (First In, First Out)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAndLoss;