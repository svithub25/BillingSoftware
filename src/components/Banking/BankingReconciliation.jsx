import React, { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Search, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

function BankingReconciliation({ bankAccounts, onRefresh }) {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [unreconciledTxns, setUnreconciledTxns] = useState([]);
  const [selectedTxns, setSelectedTxns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reconciliationHistory, setReconciliationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statementBalance, setStatementBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (selectedAccount) {
      loadUnreconciledTransactions();
      loadReconciliationHistory();
    }
  }, [selectedAccount]);

  const loadUnreconciledTransactions = async () => {
    setLoading(true);
    try {
      const txns = await window.electronAPI.getUnreconciledTransactions(selectedAccount);
      setUnreconciledTxns(txns);
      setSelectedTxns([]);
    } catch (error) {
      console.error('Error loading unreconciled transactions:', error);
      toast.error('Failed to load unreconciled transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadReconciliationHistory = async () => {
    try {
      const history = await window.electronAPI.getReconciliationHistory(selectedAccount);
      setReconciliationHistory(history);
    } catch (error) {
      console.error('Error loading reconciliation history:', error);
    }
  };

  const handleSelectTransaction = (txnId) => {
    setSelectedTxns(prev => {
      if (prev.includes(txnId)) {
        return prev.filter(id => id !== txnId);
      } else {
        return [...prev, txnId];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTxns(unreconciledTxns.map(txn => txn.id));
    } else {
      setSelectedTxns([]);
    }
  };

  const calculateSelectedBalance = () => {
    return selectedTxns.reduce((sum, txnId) => {
      const txn = unreconciledTxns.find(t => t.id === txnId);
      if (txn) {
        return sum + (txn.transaction_type === 'Debit' ? txn.amount : -txn.amount);
      }
      return sum;
    }, 0);
  };

  const getBookBalance = () => {
    const account = bankAccounts.find(acc => acc.id === parseInt(selectedAccount));
    return account ? account.current_balance : 0;
  };

  const getDifference = () => {
    if (!statementBalance) return 0;
    return parseFloat(statementBalance) - (getBookBalance() + calculateSelectedBalance());
  };

  const handleReconcile = async () => {
    if (selectedTxns.length === 0) {
      toast.error('Please select at least one transaction to reconcile');
      return;
    }

    if (!statementBalance || parseFloat(statementBalance) <= 0) {
      toast.error('Please enter a valid statement balance');
      return;
    }

    if (!confirm(`Reconcile ${selectedTxns.length} transactions?\n\nStatement Balance: ₹${parseFloat(statementBalance).toLocaleString('en-IN')}\nDifference: ₹${getDifference().toLocaleString('en-IN')}`)) {
      return;
    }

    try {
      const result = await window.electronAPI.reconcileTransactions({
        bankAccountId: selectedAccount,
        transactionIds: selectedTxns,
        statementDate,
        statementBalance: parseFloat(statementBalance),
        reconciledBy: 'admin' // Get from auth context
      });

      if (result.success) {
        toast.success('Reconciliation completed successfully!');
        loadUnreconciledTransactions();
        loadReconciliationHistory();
        setStatementBalance('');
        onRefresh();
      }
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      toast.error('Failed to reconcile transactions: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Bank Account</h3>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select Account --</option>
          {bankAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.account_name} - {acc.bank_name} (Balance: ₹{acc.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
            </option>
          ))}
        </select>
      </div>

      {selectedAccount && (
        <>
          {/* Reconciliation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Book Balance</p>
              <p className={`text-2xl font-bold ${getBookBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(getBookBalance()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Selected Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{selectedTxns.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Selected Amount</p>
              <p className={`text-2xl font-bold ${calculateSelectedBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(calculateSelectedBalance()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Unreconciled</p>
              <p className="text-2xl font-bold text-orange-600">{unreconciledTxns.length}</p>
            </div>
          </div>

          {/* Reconciliation Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statement Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statement Balance <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  step="0.01"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter statement balance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difference</label>
                <div className={`w-full border rounded-lg px-3 py-2 font-semibold ${Math.abs(getDifference()) < 0.01 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
                  }`}>
                  ₹{getDifference().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {statementBalance && Math.abs(getDifference()) > 0.01 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Reconciliation Difference Detected</p>
                  <p>
                    The difference between your statement balance and book balance is ₹{Math.abs(getDifference()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.
                    Please verify all transactions are selected correctly.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Calendar className="w-5 h-5 mr-2" />
                {showHistory ? 'Hide' : 'Show'} History
              </button>
              <button
                onClick={handleReconcile}
                disabled={selectedTxns.length === 0 || !statementBalance}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Reconcile Selected
              </button>
            </div>
          </div>

          {/* Unreconciled Transactions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Unreconciled Transactions</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedTxns.length === unreconciledTxns.length && unreconciledTxns.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unreconciledTxns.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                          No unreconciled transactions found. All transactions are reconciled!
                        </td>
                      </tr>
                    ) : (
                      unreconciledTxns.map((txn) => (
                        <tr
                          key={txn.id}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedTxns.includes(txn.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => handleSelectTransaction(txn.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTxns.includes(txn.id)}
                              onChange={() => handleSelectTransaction(txn.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date(txn.transaction_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {txn.voucher_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full
                              ${txn.voucher_type === 'Payment' ? 'bg-red-100 text-red-800' : ''}
                              ${txn.voucher_type === 'Receipt' ? 'bg-green-100 text-green-800' : ''}
                              ${txn.voucher_type === 'Contra' ? 'bg-blue-100 text-blue-800' : ''}
                            `}>
                              {txn.voucher_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{txn.party_name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                            {txn.transaction_type === 'Debit' ? (
                              <span className="text-green-600">
                                ₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                            {txn.transaction_type === 'Credit' ? (
                              <span className="text-red-600">
                                ₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {txn.cleared_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reconciliation History */}
          {showHistory && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Reconciliation History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statement Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Statement Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Book Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reconciled By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reconciliationHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          No reconciliation history found.
                        </td>
                      </tr>
                    ) : (
                      reconciliationHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date(rec.statement_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                            ₹{rec.statement_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                            ₹{rec.book_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                            <span className={rec.difference === 0 ? 'text-green-600' : 'text-red-600'}>
                              ₹{Math.abs(rec.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.reconciled_by}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(rec.created_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BankingReconciliation;