import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Filter, RefreshCw, TrendingUp, TrendingDown, IndianRupee, Eye, Package,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const LedgerData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: (() => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
      return `${fyStartYear}-04-01`;
    })(),
    endDate: new Date().toISOString().split('T')[0],
    type: 'all'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.getTransactions(filters);
      console.log('Loaded data:', response);
      setData(response);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewTransactionDetails = async (transaction) => {
    if (transaction.type === 'sale') {
      try {
        const details = await window.electronAPI.getTransactionDetails({
          type: transaction.type,
          refNumber: transaction.ref_number
        });
        console.log('Loaded transaction details:', details);
        setSelectedTransaction(details);
        setShowDetailsModal(true);
      } catch (error) {
        console.error('Error loading transaction details:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const transactions = data?.transactions || [];
  const summary = data?.summary || {
    totalSales: 0,
    totalPurchases: 0,
    totalCost: 0,
    totalProfit: 0
  };

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards - Using Pre-calculated Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-4">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-green-700">Total Sales</p>
              <p className="text-xl font-bold text-green-900">₹{summary.totalSales.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-4">
          <div className="flex items-center">
            <div className="bg-red-500 p-3 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-red-700">Total Purchases</p>
              <p className="text-xl font-bold text-red-900">₹{summary.totalPurchases.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-4">
          <div className="flex items-center">
            <div className="bg-orange-500 p-3 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-orange-700">Total Cost</p>
              <p className="text-xl font-bold text-orange-900">₹{summary.totalCost.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-sm border p-4 ${
          summary.totalProfit >= 0 
            ? 'from-blue-50 to-blue-100 border-blue-200' 
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${summary.totalProfit >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <p className={`text-xs font-medium ${summary.totalProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                Gross Profit
              </p>
              <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                ₹{summary.totalProfit.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="sales">Sales Only</option>
              <option value="purchases">Purchases Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          </div>
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, transactions.length)} of {transactions.length} transactions
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTransactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'sale' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {transaction.ref_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                    <span className={transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'}>
                      ₹{transaction.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                    {transaction.type === 'sale' ? `₹${transaction.cost?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                    {transaction.type === 'sale' ? (
                      <span className={transaction.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₹{transaction.gross_profit?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                    {transaction.type === 'sale' ? `${transaction.profit_margin || '0'}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {transaction.type === 'sale' && (
                      <button
                        onClick={() => viewTransactionDetails(transaction)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentTransactions.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transactions found for the selected period</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-2 rounded-lg mr-2 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <div className="flex gap-1">
                {currentPage > 3 && (
                  <>
                    <button onClick={() => goToPage(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">1</button>
                    {currentPage > 4 && <span className="px-2 py-2">...</span>}
                  </>
                )}
                
                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2 py-2">...</span>}
                    <button onClick={() => goToPage(totalPages)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center px-3 py-2 rounded-lg ml-2 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Transaction Details - {selectedTransaction.bill_number}
                </h2>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedTransaction.customer_name || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{new Date(selectedTransaction.sale_date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200 mb-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sale Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin %</th>
                  </tr> 
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedTransaction.items?.map((item, idx) => (
                    item.batches && item.batches.length > 0
                      ? item.batches.map((batch, bIdx) => (
                          <tr key={idx + '-' + bIdx}>
                            <td className="px-4 py-3 text-sm">
                              {item.name}
                              <span className="ml-2 text-xs text-gray-500">
                                Batch: <span className="font-medium">{batch.batch_number}</span>
                                {batch.mfg_date && (
                                  <> | Mfg: <span className="font-medium">{batch.mfg_date}</span></>
                                )}
                                {batch.exp_date && (
                                  <> | Exp: <span className="font-medium">{batch.exp_date}</span></>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{batch.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right">₹{(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">₹{((item.unit_price || 0) * batch.quantity).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-medium">₹{(batch.cost_amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{(item.profit || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">{item.profit_margin || '0'}%</td>
                          </tr>
                        ))
                      : (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right">₹{(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">₹{(item.total_amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-medium">₹{(item.cost || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{(item.profit || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">{item.profit_margin || '0'}%</td>
                          </tr>
                        )
                  ))}
                </tbody>
              </table>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold">₹{(selectedTransaction.total_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold text-orange-600">₹{(selectedTransaction.summary?.total_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST:</span>
                  <span className="font-medium">₹{(selectedTransaction.summary?.total_gst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-300">
                  <span className="font-semibold text-gray-900">Total Profit:</span>
                  <span className="font-bold text-green-600">₹{(selectedTransaction.summary?.total_profit || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit Margin:</span>
                  <span className="font-semibold text-purple-600">{selectedTransaction.summary?.profit_margin || '0'}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerData; 