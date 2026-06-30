import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import CustomerFormModal from '../modals/CustomerFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const initialFilters = { name: '', contact: '' };

const validateCustomerForm = (form) => {
  const errors = {};
  if (!form.name || form.name.trim().length < 2) errors.name = 'Name is required';
  // if (!form.contact || form.contact.trim().length < 5) errors.contact = 'Contact is required';
  return errors;
};

const CustomersTab = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [customerForm, setCustomerForm] = useState({ name: '', contact: null, address: null });
  const [customerErrors, setCustomerErrors] = useState({});
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => { }
  });

  const fetchCustomers = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCloseModal = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    setCustomerForm({ name: '', contact: '', address: '' });
    setCustomerErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setCustomerForm({ name: '', contact: '', address: '' });
        setShowCustomerForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showCustomerForm || editingCustomer) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCustomerForm, editingCustomer]);

  const handleAddCustomer = async () => {
    const errors = validateCustomerForm(customerForm);
    if (Object.keys(errors).length) {
      setCustomerErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const newCustomer = await window.electronAPI.addCustomer(customerForm);
      toast.success('Customer added');
      setCustomers((prev) => [...prev, newCustomer]);
      handleCloseModal();
    } catch (error) {
      toast.error('Error adding customer');
      console.error('Error adding customer:', error);
    }
  };

  const handleUpdateCustomer = async () => {
    const errors = validateCustomerForm(customerForm);
    if (Object.keys(errors).length) {
      setCustomerErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI || !editingCustomer) return;

    try {
      await window.electronAPI.updateCustomer({ id: editingCustomer, ...customerForm });
      toast.success('Customer updated');
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer ? { ...customerForm, id: editingCustomer } : c))
      );
      handleCloseModal();
    } catch (error) {
      toast.error('Error updating customer');
      console.error('Error updating customer:', error);
    }
  };

  const handleDeleteCustomer = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this customer?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteCustomer(id);
          toast.success('Customer deleted');
          setCustomers((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
          toast.error('Error deleting customer');
          console.error('Error deleting customer:', error);
        } finally {
          setConfirmState({ open: false, message: '', onConfirm: () => { } });
        }
      }
    });
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (customer) =>
        (!filters.name || customer.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contact || customer.contact.toLowerCase().includes(filters.contact.toLowerCase()))
    );
  }, [customers, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Contact"
            value={filters.contact}
            onChange={(e) => setFilters({ ...filters, contact: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={() => setFilters(initialFilters)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg mt-2"
        >
          Clear Filters
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Customer Management</h2>
        <button
          onClick={() => {
            setCustomerForm({ name: '', contact: '', address: '' });
            setShowCustomerForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {customer.contact}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {customer.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditingCustomer(customer.id);
                      setCustomerForm(customer);
                      setShowCustomerForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomerFormModal
        isOpen={showCustomerForm || Boolean(editingCustomer)}
        isEditing={Boolean(editingCustomer)}
        customerForm={customerForm}
        customerErrors={customerErrors}
        setCustomerForm={setCustomerForm}
        setCustomerErrors={setCustomerErrors}
        onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
        onClose={handleCloseModal}
      />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: () => { } })}
      />
    </div>
  );
};

export default CustomersTab;

