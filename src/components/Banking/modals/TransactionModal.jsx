import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import PartyComboBox from './PartyComboBox';

function TransactionModal({ isOpen, onClose, onSuccess, editData = null }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [pendingBills, setPendingBills] = useState([]);
  const [billAdjustments, setBillAdjustments] = useState({});

  const [transactionForm, setTransactionForm] = useState({
    voucher_type: 'Payment',
    transaction_date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
    party_name: '',
    amount: '',
    cheque_number: '',
    cheque_date: '',
    narration: '',
    is_pdc: false,
    to_account_id: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setIsEditMode(!!editData);
    }
  }, [isOpen, editData]);

  useEffect(() => {
    if (editData) {
      setTransactionForm({
        voucher_type: editData.voucher_type || 'Payment',
        transaction_date: editData.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        bank_account_id: editData.bank_account_id || '',
        party_name: editData.party_name || '',
        amount: editData.amount || '',
        cheque_number: editData.cheque_number || '',
        cheque_date: editData.cheque_date?.split('T')[0] || '',
        narration: editData.narration || '',
        is_pdc: editData.is_pdc || false,
        to_account_id: editData.to_account_id || ''
      });
    }
  }, [editData]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const accountsData = await window.electronAPI.getBankAccounts();
      setBankAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load form data');
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingBills = async (contactId, type) => {
    try {
      if (type === 'Receipt') {
        const sales = await window.electronAPI.getPendingSales(contactId);
        setPendingBills(sales || []);
      } else if (type === 'Payment') {
        const purchases = await window.electronAPI.getPendingPurchases(contactId);
        setPendingBills(purchases || []);
      } else {
        setPendingBills([]);
      }
      setBillAdjustments({});
    } catch (error) {
      console.error('Error fetching pending bills:', error);
      setPendingBills([]);
    }
  };

  const handleAdjustmentChange = (billId, amount) => {
    setBillAdjustments(prev => ({
      ...prev,
      [billId]: parseFloat(amount) || 0
    }));
  };

  const calculateTotalAdjustment = () => {
    return Object.values(billAdjustments).reduce((sum, amt) => sum + (amt || 0), 0);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!transactionForm.bank_account_id) {
      newErrors.bank_account_id = 'Please select a bank account';
    }

    if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (transactionForm.voucher_type === 'Contra') {
      if (!transactionForm.to_account_id) {
        newErrors.to_account_id = 'Please select destination account';
      }
      
      if (transactionForm.bank_account_id === transactionForm.to_account_id) {
        newErrors.to_account_id = 'Source and destination accounts cannot be the same';
      }
    }

    if (transactionForm.voucher_type !== 'Contra' && !transactionForm.party_name?.trim()) {
      newErrors.party_name = 'Please enter To';
    }

    if (transactionForm.cheque_number && !transactionForm.cheque_date) {
      newErrors.cheque_date = 'Cheque date is required when cheque number is provided';
    }

    const totalAdjusted = calculateTotalAdjustment();
    if (totalAdjusted > 0 && totalAdjusted > parseFloat(transactionForm.amount || 0)) {
      newErrors.amount = 'Adjusted amount cannot exceed total amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editData) {
        // UPDATE existing transaction
        const result = await window.electronAPI.updateBankTransaction(editData.id, {
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          created_by: 'admin'
        });
        
        if (result.success) {
          const transactionTypeText = 
            transactionForm.voucher_type === 'Payment' ? 'Payment' :
            transactionForm.voucher_type === 'Receipt' ? 'Receipt' :
            'Bank Transfer';
          toast.success(`${transactionTypeText} updated successfully!`);
          onSuccess();
          handleClose();
        }
      } else {
        // CREATE new transaction
        const voucherNumber = await window.electronAPI.generateVoucherNumber(transactionForm.voucher_type);
        
        const adjustmentsToSave = Object.entries(billAdjustments)
          .map(([id, amt]) => ({
            [transactionForm.voucher_type === 'Receipt' ? 'invoice_id' : 'purchase_id']: parseInt(id),
            adjusted_amount: amt
          }))
          .filter(adj => adj.adjusted_amount > 0);

        const result = await window.electronAPI.saveBankTransaction({
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          voucher_number: voucherNumber,
          created_by: 'admin',
          billAdjustments: adjustmentsToSave
        });
        
        if (result.success) {
          const transactionTypeText = 
            transactionForm.voucher_type === 'Payment' ? 'Payment' :
            transactionForm.voucher_type === 'Receipt' ? 'Receipt' :
            'Bank Transfer';
          toast.success(`${transactionTypeText} saved successfully!`);
          onSuccess();
          handleClose();
        }
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTransactionForm({
      voucher_type: 'Payment',
      transaction_date: new Date().toISOString().split('T')[0],
      bank_account_id: '',
      party_name: '',
      amount: '',
      cheque_number: '',
      cheque_date: '',
      narration: '',
      is_pdc: false,
      to_account_id: ''
    });
    setErrors({});
    setIsEditMode(false);
    setPendingBills([]);
    setBillAdjustments({});
    onClose();
  };

  const handleVoucherTypeChange = (type) => {
    setTransactionForm({
      ...transactionForm,
      voucher_type: type,
      category_type: type === 'Payment' ? 'Expense' : 'Income',
      party_name: '',
      party_id: null,
      party_type: 'contact',
      to_account_id: ''
    });
    setErrors({});
    setPendingBills([]);
    setBillAdjustments({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Transaction' : 'New Banking Entry'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Voucher Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'Payment', label: 'Payment', color: 'red' },
                  { value: 'Receipt', label: 'Receipt', color: 'green' },
                  { value: 'Contra', label: 'Contra', color: 'blue' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleVoucherTypeChange(type.value)}
                    className={`p-3 rounded-lg border-2 font-medium transition-all ${
                      transactionForm.voucher_type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={transactionForm.transaction_date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {transactionForm.voucher_type === 'Contra' ? 'From Account' : 'Bank Account'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={transactionForm.bank_account_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, bank_account_id: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.bank_account_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select Account</option>
                  {bankAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} - {acc.bank_name} (₹{acc.current_balance?.toFixed(2)})
                    </option>
                  ))}
                </select>
                {errors.bank_account_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.bank_account_id}</p>
                )}
              </div>

              {/* For Contra - To Account */}
              {transactionForm.voucher_type === 'Contra' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transactionForm.to_account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, to_account_id: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                      errors.to_account_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Destination Account</option>
                    {bankAccounts
                      ?.filter(acc => acc.id !== parseInt(transactionForm.bank_account_id))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name} - {acc.bank_name} (₹{acc.current_balance?.toFixed(2)})
                        </option>
                      ))}
                  </select>
                  {errors.to_account_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.to_account_id}</p>
                  )}
                </div>
              )}

              {/* Party Name - Not for Contra - UPDATED WITH COMBOBOX */}
              {transactionForm.voucher_type !== 'Contra' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To <span className="text-red-500">*</span>
                  </label>
                  <PartyComboBox
                    value={transactionForm.party_name}
                    onChange={(value, party) => {
                      setTransactionForm({ 
                        ...transactionForm, 
                        party_name: value, 
                        party_id: party?.id || null, 
                        party_type: party?.source_type || 'contact' 
                      });
                      if (party && party.source_type === 'contact') {
                        fetchPendingBills(party.id, transactionForm.voucher_type);
                      } else {
                        setPendingBills([]);
                        setBillAdjustments({});
                      }
                    }}
                    voucherType={transactionForm.voucher_type}
                    disabled={saving}
                    error={errors.party_name}
                  />
                </div>
              )}

              {/* Amount */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  required
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Bill Adjustments */}
              {pendingBills.length > 0 && !isEditMode && (
                <div className="col-span-2 mt-4 border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Adjust Against Pending Bills</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {pendingBills.map(bill => {
                      const balance = bill.total_amount - (bill.paid_amount || 0);
                      return (
                        <div key={bill.id} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div>
                            <p className="font-medium text-sm text-gray-800">{bill.bill_number || bill.invoice_number}</p>
                            <p className="text-xs text-gray-500">
                              Date: {new Date(bill.sale_date || bill.purchase_date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Balance: ₹{balance.toFixed(2)} (Total: ₹{bill.total_amount.toFixed(2)})
                            </p>
                          </div>
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={balance}
                              value={billAdjustments[bill.id] || ''}
                              onChange={(e) => handleAdjustmentChange(bill.id, e.target.value)}
                              className="w-32 border rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500"
                              placeholder="Amount"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium text-gray-700">Total Adjusted:</span>
                    <span className={`text-sm font-bold ${calculateTotalAdjustment() > parseFloat(transactionForm.amount || 0) ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{calculateTotalAdjustment().toFixed(2)} / ₹{(parseFloat(transactionForm.amount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Narration */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                <textarea
                  value={transactionForm.narration}
                  onChange={(e) => setTransactionForm({ ...transactionForm, narration: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter transaction details..."
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Transaction Type Guide:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Payment:</strong> Money going out (expenses, vendor payments)</li>
                  <li><strong>Receipt:</strong> Money coming in (sales, customer payments)</li>
                  <li><strong>Contra:</strong> Transfer between bank accounts</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300" 
                disabled={saving}
              >
                {saving ? 'Saving...' : isEditMode ? 'Update Transaction' : 'Save Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TransactionModal;