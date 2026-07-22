import React, { useState } from 'react';
import { BookOpen, TrendingUp, BarChart3 } from 'lucide-react';
import PinProtected from './reusables/PinProtected';
import LedgerData from './Ledger/LedgerData';
import ProfitAndLoss from './Ledger/ProfitAndLoss';
import BalanceSheet from './Ledger/BalanceSheet';

const Ledger = () => {
  const [activeTab, setActiveTab] = useState('ledger');

  const tabs = [
    { id: 'ledger', name: 'Ledger', icon: BookOpen },
    { id: 'profitLoss', name: 'Profit & Loss', icon: TrendingUp },
    { id: 'balanceSheet', name: 'Balance Sheet', icon: BarChart3 }
  ];

  return (
    // <PinProtected message="This module is protected and requires PIN verification to access." modulename='Ledger'>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-600">Comprehensive financial reporting and analysis</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'ledger' && <LedgerData />}
            {activeTab === 'profitLoss' && <ProfitAndLoss />}
            {activeTab === 'balanceSheet' && <BalanceSheet />}
          </div> 
        </div>
      </div>
    //  </PinProtected>
  );
};

export default Ledger;