import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

function AddAccountModal({ onClose, onSuccess }) {
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    account_type: 'Current',
    opening_balance: 0,
    //opening_balance_type: 'Debit'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!accountForm.account_name || !accountForm.account_number || !accountForm.bank_name) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.addBankAccount(accountForm);
      if (result.success) {
        toast.success('Bank account added successfully!');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error('Failed to add bank account: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Add Bank Account</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountForm.account_name}
                onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Main Business Account"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountForm.bank_name}
                onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., HDFC Bank"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountForm.account_number}
                onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Account number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
              <input
                type="text"
                value={accountForm.branch_name}
                onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Branch name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
              <input
                type="text"
                value={accountForm.ifsc_code}
                onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="IFSC code"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <select
                value={accountForm.account_type}
                onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
                <option value="Cash Credit">Cash Credit</option>
                <option value="Overdraft">Overdraft</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Opening Balance</label>
              <input
                type="number"
                onWheel={e => e.target.blur()}
                step="0.01"
                value={accountForm.opening_balance}
                onChange={(e) => setAccountForm({ ...accountForm, opening_balance: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance Type</label>
              <select
                value={accountForm.opening_balance_type}
                onChange={(e) => setAccountForm({ ...accountForm, opening_balance_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Debit">Debit (Positive)</option>
                <option value="Credit">Credit (Negative)</option>
              </select>
            </div> */}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Opening balance represents the starting amount in this account.
              Select 'Debit (Positive)' if you have money in the account, or 'Credit (Negative)' if the account is overdrawn.
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
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
              {saving ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAccountModal;