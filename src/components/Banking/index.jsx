import React, { useState, useEffect } from 'react';
import PinProtected from '../reusables/PinProtected';
import { Banknote, FileText, CheckCircle, Calendar, TrendingUp, Settings } from 'lucide-react';

// Import tab components
import BankingDashboard from './BankingDashboard';
import BankingTransactions from './BankingTransactions';
import BankingReports from './BankingReports';
import BankSettings from './BankSettings';
import { toast } from 'react-toastify';

function Banking() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadBankAccounts();
    loadCategories();
  }, [refreshTrigger]);

  const loadBankAccounts = async () => {
    try {
      const accounts = await window.electronAPI.getBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('Failed to load bank accounts');
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await window.electronAPI.getTransactionCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // NEW: Handler for transaction changes
  const handleTransactionChange = () => {
    handleRefresh();
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Banknote },
    { id: 'transactions', name: 'Transactions', icon: FileText },
    { id: 'reports', name: 'Reports', icon: TrendingUp },
    // { id: 'bank_settings', name: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* <PinProtected message="This module is protected and requires PIN verification to access." modulename="Banking"> */}
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Banking & Cash Management</h1>
          <p className="text-gray-600">Manage bank accounts, transactions, and reconciliation</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <IconComponent className="w-5 h-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <BankingDashboard
            bankAccounts={bankAccounts}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'transactions' && (
          <BankingTransactions
            bankAccounts={bankAccounts}
            categories={categories}
            onRefresh={handleRefresh}
            onTransactionChange={handleTransactionChange}
          />
        )}

        {activeTab === 'reports' && (
          <BankingReports
            bankAccounts={bankAccounts}
          />
        )}

        {/* {activeTab === 'bank_settings' && (
          <BankSettings 
            onRefresh={handleRefresh}
          />
        )} */}
      </div>
      {/* </PinProtected> */}
    </>
  );
}

export default Banking;