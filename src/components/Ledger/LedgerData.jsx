import React, { useState, useEffect } from 'react';
import { BookOpen, Search, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const LedgerData = () => {
  const [contacts, setContacts] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [selectedLedgerType, setSelectedLedgerType] = useState('contact'); // 'contact' or 'account_group'
  
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: (() => {
      const today = new Date();
      return `${today.getFullYear()}-04-01`; // Default FY start
    })(),
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (selectedLedgerId) {
      loadLedger();
    }
  }, [selectedLedgerId, selectedLedgerType, filters]);

  const fetchOptions = async () => {
    try {
      const contactsData = await window.electronAPI.getContacts();
      const groupsData = await window.electronAPI.getAccountGroups();
      setContacts(contactsData);
      setAccountGroups(groupsData);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getContactLedger({
        ledgerType: selectedLedgerType,
        ledgerId: parseInt(selectedLedgerId),
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      setLedgerData(data);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Account / Party</label>
            <div className="flex space-x-2">
              <select
                value={selectedLedgerType}
                onChange={(e) => {
                  setSelectedLedgerType(e.target.value);
                  setSelectedLedgerId('');
                  setLedgerData(null);
                }}
                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="contact">Party / Contact</option>
                <option value="account_group">Account Group</option>
              </select>
              <select
                value={selectedLedgerId}
                onChange={(e) => setSelectedLedgerId(e.target.value)}
                className="w-2/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select --</option>
                {selectedLedgerType === 'contact' 
                  ? contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.group_name})</option>)
                  : accountGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                }
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : ledgerData ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">
              {ledgerData.account.name} Ledger Account
            </h2>
            <div className="text-sm">
              <span className="text-gray-500 mr-2">Closing Balance:</span>
              <span className={`font-bold ${ledgerData.closingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{Math.abs(ledgerData.closingBalance).toFixed(2)} {ledgerData.closingBalance < 0 ? 'Cr' : 'Dr'}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Particulars</th>
                  <th className="px-4 py-3">Vch Type</th>
                  <th className="px-4 py-3">Vch No.</th>
                  <th className="px-4 py-3 text-right">Debit (₹)</th>
                  <th className="px-4 py-3 text-right">Credit (₹)</th>
                  <th className="px-4 py-3 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-orange-50/30">
                  <td className="px-4 py-3" colSpan="4"><strong>Opening Balance</strong></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-600">
                    {ledgerData.openingBalance > 0 ? ledgerData.openingBalance.toFixed(2) : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-600">
                    {ledgerData.openingBalance < 0 ? Math.abs(ledgerData.openingBalance).toFixed(2) : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {Math.abs(ledgerData.openingBalance).toFixed(2)} {ledgerData.openingBalance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>

                {ledgerData.transactions.map((txn, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">{new Date(txn.transaction_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={txn.particulars}>{txn.particulars}</td>
                    <td className="px-4 py-3 capitalize">{txn.voucher_type}</td>
                    <td className="px-4 py-3">{txn.voucher_no}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {txn.debit > 0 ? txn.debit.toFixed(2) : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {txn.credit > 0 ? txn.credit.toFixed(2) : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={txn.running_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                        {Math.abs(txn.running_balance).toFixed(2)} {txn.running_balance < 0 ? 'Cr' : 'Dr'}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {ledgerData.transactions.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No transactions found for this period.
                    </td>
                  </tr>
                )}
                
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-800 text-sm">
                  <td className="px-4 py-3 text-right" colSpan="4">Current Total</td>
                  <td className="px-4 py-3 text-right">
                    {ledgerData.transactions.reduce((sum, t) => sum + (t.debit || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ledgerData.transactions.reduce((sum, t) => sum + (t.credit || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                     {Math.abs(ledgerData.closingBalance).toFixed(2)} {ledgerData.closingBalance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg">Select an account and date range to view the ledger.</p>
        </div>
      )}
    </div>
  );
};

export default LedgerData;