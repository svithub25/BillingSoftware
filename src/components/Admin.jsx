import React, { useState } from 'react';
import { Package, Users, Tag, Percent, Menu } from 'lucide-react';
import PinProtected from './reusables/PinProtected';
import ProductsTab from './admin/tabs/ProductsTab';
import SuppliersTab from './admin/tabs/SuppliersTab';
import UnitsTab from './admin/tabs/UnitsTab';
import GstTab from './admin/tabs/GstTab';
import CategoriesTab from './admin/tabs/CategoriesTab';
import SalesmanTab from './admin/tabs/SalesmanTab';
import CustomersTab from './admin/tabs/CustomersTab';

const TAB_CONFIG = [
  { id: 'products', name: 'Products', icon: Package, component: ProductsTab },
  { id: 'suppliers', name: 'Suppliers', icon: Users, component: SuppliersTab },
  { id: 'categories', name: 'Categories', icon: Tag, component: CategoriesTab },
  { id: 'units', name: 'Units', icon: Tag, component: UnitsTab },
  { id: 'gst', name: 'GST Rates', icon: Percent, component: GstTab },
  { id: 'salesman', name: 'Salesmen', icon: Users, component: SalesmanTab },
  { id: 'customers', name: 'Customers', icon: Users, component: CustomersTab }
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState(TAB_CONFIG[0].id);
  const [menuOpen, setMenuOpen] = useState(false);

  const ActiveTabComponent =
    TAB_CONFIG.find((tab) => tab.id === activeTab)?.component ?? TAB_CONFIG[0].component;

  return (
    <PinProtected
      message="This module is protected and requires PIN verification to access."
      modulename="Admin"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Manage products, suppliers, and system settings</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            {/* Responsive Tabs */}
            <nav className="flex px-6">
              {/* Mobile: Hamburger menu */}
              <div className="w-full flex md:hidden justify-between items-center">
                <span className="font-semibold text-base">Menu</span>
                <button
                  className="p-2"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
              {/* Mobile: Dropdown */}
              {menuOpen && (
                <div className="absolute left-0 right-0 top-20 bg-white shadow-lg z-10 md:hidden">
                  {TAB_CONFIG.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center py-3 px-6 border-b font-medium text-sm ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Desktop: Horizontal tabs */}
              <div className="hidden md:flex space-x-8 w-full">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </div>
            </nav>
          </div>

          <div className="p-6">
            <ActiveTabComponent />
          </div>
        </div>
      </div>
    </PinProtected>
  );
};

export default Admin; 

