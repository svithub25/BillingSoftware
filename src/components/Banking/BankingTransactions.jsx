import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Trash2, CheckCircle, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import TransactionModal from './modals/TransactionModal';
import TransactionDetailsModal from './modals/TransactionDetailsModal';
import ChequeStatusModal from './modals/ChequeStatusModal';
import ConfirmModal from './modals/ConfirmModal';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const BankingTransactions = ({ onTransactionChange }) => {
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    bank_account_id: '',
    voucher_type: '',
    cleared_status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await window.electronAPI.getBankAccounts();
      setBankAccounts(accounts || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('Failed to load bank accounts');
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getBankTransactions(filters);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleChequeStatus = (transaction) => {
    setSelectedTransaction(transaction);
    setShowChequeModal(true);
  };

  const handleViewDetails = async (transaction) => {
    try {
      const details = await window.electronAPI.getBankTransactionDetails(transaction.id);
      setSelectedTransaction(details);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading transaction details:', error);
      toast.error('Failed to load transaction details');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const result = await window.electronAPI.deleteBankTransaction(deleteId);
      if (result.success) {
        toast.success('Transaction deleted successfully');
        loadTransactions();
        setShowDeleteConfirm(false);
        setDeleteId(null);

        // Trigger dashboard refresh
        if (onTransactionChange) {
          onTransactionChange();
        }
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Cleared': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Deposited': 'bg-blue-100 text-blue-800',
      'Bounced': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Highlight matching text
  const highlightText = (text, search) => {
    if (!search || !text) return text;

    const parts = text.toString().split(new RegExp(`(${search})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 font-semibold px-1 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  const filteredTransactions = transactions.filter(txn => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      txn.voucher_number?.toLowerCase().includes(search) ||
      txn.party_name?.toLowerCase().includes(search) ||
      txn.account_name?.toLowerCase().includes(search) ||
      txn.bank_name?.toLowerCase().includes(search) ||
      txn.cheque_number?.toLowerCase().includes(search) ||
      txn.narration?.toLowerCase().includes(search) ||
      txn.amount?.toString().includes(search)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleEdit = async (transaction) => {
    // Check if transaction can be edited
    if (transaction.reconciled === 1) {
      toast.error('Cannot edit reconciled transaction');
      return;
    }

    if (transaction.cleared_status === 'Cleared' && transaction.cheque_number) {
      toast.error('Cannot edit cleared cheque transaction');
      return;
    }

    try {
      // Get full transaction details including to_account_id for Contra
      const details = await window.electronAPI.getBankTransactionDetails(transaction.id);

      // For Contra transactions, find the destination account
      if (details.voucher_type === 'Contra') {
        const contraReceipt = transactions.find(
          t => t.voucher_number === details.voucher_number + '-IN'
        );
        if (contraReceipt) {
          details.to_account_id = contraReceipt.bank_account_id;
        }
      }

      setEditingTransaction(details);
      setShowTransactionModal(true);
    } catch (error) {
      console.error('Error loading transaction for edit:', error);
      toast.error('Failed to load transaction details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-1">
              Found {filteredTransactions.length} result{filteredTransactions.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          )}
        </div>
        <button
          onClick={() => setShowTransactionModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <select
              value={filters.bank_account_id}
              onChange={(e) => setFilters({ ...filters, bank_account_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Banks</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} - {account.bank_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type</label>
            <select
              value={filters.voucher_type}
              onChange={(e) => setFilters({ ...filters, voucher_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
              <option value="Contra">Contra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search voucher, party, bank..."
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-bold"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Info & Pagination Controls */}
      <div className="flex justify-between items-center">
        {searchTerm && filteredTransactions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Searching in:</span> Voucher Number, Party Name, Bank Name, Account Name, Narration, Amount
            </p>
          </div>
        )}

        {!searchTerm && (
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Rows per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date <br /> (dd / mm / yyyy)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-500">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? `No transactions found matching "${searchTerm}"` : 'No transactions found'}
                  </td>
                </tr>
              ) : (
                currentTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(txn.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {highlightText(txn.voucher_number, searchTerm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${txn.voucher_type === 'Payment' ? 'bg-red-100 text-red-800' :
                        txn.voucher_type === 'Receipt' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {txn.voucher_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {txn.party_name ? highlightText(txn.party_name, searchTerm) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{highlightText(txn.account_name, searchTerm)}</span>
                        <span className="text-xs text-gray-500">{highlightText(txn.bank_name, searchTerm)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {highlightText(`₹${txn.amount?.toFixed(2)}`, searchTerm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(txn.cleared_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(txn)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button - Only show if not reconciled and not cleared cheque */}
                        {txn.reconciled !== 1 && !(txn.cleared_status === 'Cleared' && txn.cheque_number) && (
                          <button
                            onClick={() => handleEdit(txn)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {txn.cheque_number && txn.cleared_status !== 'Cleared' && txn.cleared_status !== 'Cancelled' && (
                          <button
                            onClick={() => handleChequeStatus(txn)}
                            className="text-green-600 hover:text-green-800"
                            title="Update Cheque Status"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteClick(txn.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Go to:</span>
            <input
              type="number"
              onWheel={e => e.target.blur()}
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  handlePageChange(page);
                }
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          loadTransactions();
          setEditingTransaction(null);

          // Trigger dashboard refresh
          if (onTransactionChange) {
            onTransactionChange();
          }
        }}
        editData={editingTransaction}
      />

      <TransactionDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        transaction={selectedTransaction}
      />

      <ChequeStatusModal
        isOpen={showChequeModal}
        onClose={() => setShowChequeModal(false)}
        transaction={selectedTransaction}
        onStatusUpdate={() => {
          loadTransactions();

          // Trigger dashboard refresh
          if (onTransactionChange) {
            onTransactionChange();
          }
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will reverse the bank balance changes and cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        loading={deleteLoading}
      />
    </div>
  );
};

export default BankingTransactions;