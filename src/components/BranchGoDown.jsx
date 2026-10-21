import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Repeat, X, CheckCircle, Package, Edit, Eye, Warehouse } from 'lucide-react';
import { toast } from 'react-toastify';

const BranchGoDown = () => {
  // State
  const [godowns, setGodowns] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStockViewModalOpen, setIsStockViewModalOpen] = useState(false);
  const [selectedGodown, setSelectedGodown] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('transfers'); // 'transfers' or 'stock'
  const [loading, setLoading] = useState(true);
  const [refreshStockTrigger, setRefreshStockTrigger] = useState(0);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchGodowns(),
        fetchMovements()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const refreshStockView = () => {
    setRefreshStockTrigger(prev => prev + 1);
  };

  const fetchGodowns = async () => {
    try {
      const result = await window.electronAPI.getActiveGodowns();
      if (result.success) {
        setGodowns(result.data);
      }
    } catch (error) {
      console.error('Error fetching godowns:', error);
    }
  };

  const fetchMovements = async () => {
    try {
      const result = await window.electronAPI.getStockMovements({});
      if (result.success) {
        setMovements(result.data);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const handleDeleteMovement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteStockMovement(id);
      if (result.success) {
        toast.success('Transfer deleted successfully');
        fetchMovements();
        refreshStockView(); // Refresh stock view to show updated quantities
      } else {
        toast.error(result.error || 'Failed to delete transfer');
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast.error('Failed to delete transfer');
    }
  };

  const handleToggleStatus = async (movement) => {
    const newStatus = movement.movement_status === 'completed' ? 'draft' : 'completed';

    try {
      const result = await window.electronAPI.updateMovementStatus(
        movement.id,
        newStatus,
        ''
      );

      if (result.success) {
        toast.success(`Transfer marked as ${newStatus}`);
        fetchMovements();
        refreshStockView(); // Refresh stock view to show updated quantities
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const viewDetails = async (movementId) => {
    try {
      const result = await window.electronAPI.getStockMovementDetails(movementId);
      if (result.success) {
        setSelectedMovement(result.data);
        setIsDetailsModalOpen(true);
      } else {
        toast.error(result.error || 'Failed to load details');
      }
    } catch (error) {
      console.error('Error fetching movement details:', error);
      toast.error('Failed to load details');
    }
  };

  // Filtering/Searching
  const filteredMovements = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) return movements;

    return movements.filter(m =>
      String(m.id).includes(lowerSearchTerm) ||
      m.movement_number?.toLowerCase().includes(lowerSearchTerm) ||
      m.from_godown_name?.toLowerCase().includes(lowerSearchTerm) ||
      m.to_godown_name?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [movements, searchTerm]);

  // Utility Classes
  const tableHeaderClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
  const tableDataClass = "px-6 py-4 text-sm text-gray-900";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Warehouse className="w-6 h-6 mr-2 text-blue-600" />
            Stock Transfer Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Transfer stock between godowns and branches</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Transfer
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('transfers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'transfers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Stock Transfers
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Stock by Location
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'transfers' ? (
            <>
              {/* Search */}
              <div className="relative mb-6 max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Number, Location..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Transfers Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className={tableHeaderClass + ' w-20'}>ID</th>
                      <th scope="col" className={tableHeaderClass}>Transfer #</th>
                      <th scope="col" className={tableHeaderClass}>Date</th>
                      <th scope="col" className={tableHeaderClass}>From Location</th>
                      <th scope="col" className={tableHeaderClass}>To Location</th>
                      <th scope="col" className={tableHeaderClass + ' text-right'}>Total Qty</th>
                      <th scope="col" className={tableHeaderClass}>Status</th>
                      <th scope="col" className={tableHeaderClass + ' text-right'}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-500">
                          No stock transfers found.
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map(m => {
                        const isCompleted = m.movement_status === 'completed';
                        const statusColors = {
                          'draft': 'bg-gray-100 text-gray-800',
                          'pending_approval': 'bg-yellow-100 text-yellow-800',
                          'approved': 'bg-blue-100 text-blue-800',
                          'in_transit': 'bg-purple-100 text-purple-800',
                          'completed': 'bg-green-100 text-green-800',
                          'cancelled': 'bg-red-100 text-red-800'
                        };

                        return (
                          <tr key={m.id} className="hover:bg-blue-50">
                            <td className={tableDataClass + ' font-semibold'}>{m.id}</td>
                            <td className={tableDataClass + ' font-medium text-blue-700'}>{m.movement_number}</td>
                            <td className={tableDataClass}>{m.movement_date}</td>
                            <td className={tableDataClass}>
                              <div className="font-medium text-gray-900">{m.from_godown_name || '-'}</div>
                            </td>
                            <td className={tableDataClass}>
                              <div className="font-medium text-gray-900">{m.to_godown_name || '-'}</div>
                            </td>
                            <td className={tableDataClass + ' text-right font-bold'}>{m.total_quantity || 0}</td>
                            <td className={tableDataClass}>
                              <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusColors[m.movement_status] || statusColors.draft}`}>
                                {m.movement_status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className={tableDataClass + ' text-right space-x-2'}>
                              <button
                                onClick={() => viewDetails(m.id)}
                                className="text-blue-600 hover:text-blue-900 transition duration-150 p-1 rounded hover:bg-blue-50"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(m)}
                                className="text-green-600 hover:text-green-900 transition duration-150 text-xs px-2 py-1 rounded hover:bg-green-50"
                                title="Toggle Status"
                              >
                                {isCompleted ? 'Revert' : 'Complete'}
                              </button>
                              {m.movement_status !== 'completed' && (
                                <button
                                  onClick={() => handleDeleteMovement(m.id)}
                                  className="text-red-600 hover:text-red-900 transition duration-150 p-1 rounded hover:bg-red-50"
                                  title="Delete Transfer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            // Stock by Location View
            <StockByLocationView godowns={godowns} refreshTrigger={refreshStockTrigger} />
          )}
        </div>
      </div>

      {/* Transfer Form Modal */}
      {isModalOpen && (
        <TransferFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          godowns={godowns}
          onSuccess={() => {
            fetchMovements();
            refreshStockView(); // Refresh stock view when new transfer is created
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedMovement && (
        <DetailsModal
          movement={selectedMovement}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedMovement(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// TRANSFER FORM MODAL
// ============================================

const TransferFormModal = ({ isOpen, onClose, godowns, onSuccess }) => {
  const [formData, setFormData] = useState({
    movement_date: new Date().toISOString().substring(0, 10),
    from_godown_id: '',
    to_godown_id: '',
    vehicle_number: '',
    driver_name: '',
    transport_mode: '',
    reason: '',
    dispatch_notes: ''
  });

  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([{ item_id: '', quantity: '', unit_rate: 0 }]);
  const [error, setError] = useState('');

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  // Fetch inventory when source godown changes
  useEffect(() => {
    if (formData.from_godown_id) {
      fetchInventory(formData.from_godown_id);
    }
  }, [formData.from_godown_id]);

  const fetchInventory = async (godownId) => {
    try {
      const result = await window.electronAPI.getInventoryForTransfer(godownId);
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...selectedItems];
    newItems[index][field] = value;

    // Auto-fill unit rate when item is selected
    if (field === 'item_id' && value) {
      const item = items.find(i => i.id === parseInt(value));
      if (item) {
        newItems[index].unit_rate = item.purchase_rate || 0;
      }
    }

    setSelectedItems(newItems);
  };

  const addItemRow = () => {
    setSelectedItems([...selectedItems, { item_id: '', quantity: '', unit_rate: 0 }]);
  };

  const removeItemRow = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.from_godown_id || !formData.to_godown_id) {
      setError('Please select both source and destination locations');
      return;
    }

    if (formData.from_godown_id === formData.to_godown_id) {
      setError('Source and destination must be different');
      return;
    }

    const validItems = selectedItems.filter(item => item.item_id && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one item with quantity');
      return;
    }

    // Check stock availability
    for (const item of validItems) {
      const itemData = items.find(i => i.id === parseInt(item.item_id));
      if (itemData && parseFloat(item.quantity) > itemData.available_stock) {
        setError(`Insufficient stock for ${itemData.name}. Available: ${itemData.available_stock}`);
        return;
      }
    }

    try {
      // Generate movement number
      const numberResult = await window.electronAPI.generateMovementNumber('transfer');
      if (!numberResult.success) {
        setError('Failed to generate transfer number');
        return;
      }

      // Calculate totals
      const totalQuantity = validItems.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
      const totalValue = validItems.reduce((sum, item) =>
        sum + (parseFloat(item.quantity) * parseFloat(item.unit_rate || 0)), 0
      );

      // Prepare movement data
      const movementData = {
        ...formData,
        movement_number: numberResult.movementNumber,
        movement_category: 'transfer',
        movement_status: 'draft',
        total_quantity: totalQuantity,
        total_value: totalValue,
        items: validItems.map(item => ({
          item_id: parseInt(item.item_id),
          quantity: parseFloat(item.quantity),
          unit_rate: parseFloat(item.unit_rate || 0),
          total_value: parseFloat(item.quantity) * parseFloat(item.unit_rate || 0)
        }))
      };

      const result = await window.electronAPI.createStockMovement(movementData);

      if (result.success) {
        toast.success('Stock transfer created successfully');
        onSuccess();
      } else {
        setError(result.error || 'Failed to create transfer');
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      setError('Failed to create transfer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        {/* Modal Header */}
        <div className="p-5 rounded-t-lg border-b bg-blue-50 border-blue-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-800 flex items-center">
            <Repeat className="w-5 h-5 mr-2" />
            Create Stock Transfer
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* Date and Locations */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="movement_date" className={labelClass}>Transfer Date *</label>
              <input
                type="date"
                id="movement_date"
                name="movement_date"
                value={formData.movement_date}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="from_godown_id" className={labelClass}>From Location *</label>
              <select
                id="from_godown_id"
                name="from_godown_id"
                value={formData.from_godown_id}
                onChange={handleChange}
                className={inputClass}
                required
              >
                <option value="">Select Source</option>
                {godowns.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="to_godown_id" className={labelClass}>To Location *</label>
              <select
                id="to_godown_id"
                name="to_godown_id"
                value={formData.to_godown_id}
                onChange={handleChange}
                className={inputClass}
                required
              >
                <option value="">Select Destination</option>
                {godowns.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Items to Transfer *</label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {selectedItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <select
                      value={item.item_id}
                      onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                      className={inputClass + ' text-sm'}
                      required
                    >
                      <option value="">Select Item</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku}) - Stock: {i.available_stock || 0}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      onWheel={e => e.target.blur()}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className={inputClass + ' text-sm'}
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      onWheel={e => e.target.blur()}
                      placeholder="Rate"
                      value={item.unit_rate}
                      onChange={(e) => handleItemChange(index, 'unit_rate', e.target.value)}
                      className={inputClass + ' text-sm'}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transport Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="transport_mode" className={labelClass}>Transport Mode</label>
              <input
                type="text"
                id="transport_mode"
                name="transport_mode"
                value={formData.transport_mode}
                onChange={handleChange}
                className={inputClass}
                placeholder="Own Vehicle / Courier / Third Party"
              />
            </div>
            <div>
              <label htmlFor="vehicle_number" className={labelClass}>Vehicle Number</label>
              <input
                type="text"
                id="vehicle_number"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="MH-01-AB-1234"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dispatch_notes" className={labelClass}>Notes</label>
            <textarea
              id="dispatch_notes"
              name="dispatch_notes"
              value={formData.dispatch_notes}
              onChange={handleChange}
              className={inputClass}
              rows="2"
              placeholder="Any additional notes for this transfer..."
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Create Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// DETAILS MODAL
// ============================================

const DetailsModal = ({ movement, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        {/* Header */}
        <div className="p-5 rounded-t-lg border-b bg-blue-50 border-blue-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-800">
            Transfer Details - {movement.movement_number}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Movement Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-base text-gray-900">{movement.movement_date}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-base text-gray-900 capitalize">{movement.movement_status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">From Location</p>
              <p className="text-base text-gray-900">{movement.from_godown_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">To Location</p>
              <p className="text-base text-gray-900">{movement.to_godown_name || '-'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movement.items?.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.sku}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {item.received_quantity || item.dispatched_quantity || item.planned_quantity} {item.unit}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{item.unit_rate || 0}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">₹{item.total_value || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {movement.dispatch_notes && (
            <div>
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="text-base text-gray-900">{movement.dispatch_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STOCK BY LOCATION VIEW
// ============================================

const StockByLocationView = ({ godowns, refreshTrigger }) => {
  const [locationStock, setLocationStock] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load stock for default godown initially
    const defaultGodown = godowns.find(g => g.is_default === 1) || godowns[0];
    if (defaultGodown) {
      setSelectedLocation(defaultGodown.id);
    }
  }, [godowns]);

  useEffect(() => {
    if (selectedLocation) {
      fetchLocationStock(selectedLocation);
    }
  }, [selectedLocation, refreshTrigger]); // Re-fetch when location changes OR refreshTrigger changes

  const fetchLocationStock = async (godownId) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getLocationStock(godownId);
      if (result.success) {
        setLocationStock(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch stock');
      }
    } catch (error) {
      console.error('Error fetching location stock:', error);
      toast.error('Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) return locationStock;

    return locationStock.filter(item =>
      item.item_name?.toLowerCase().includes(lowerSearchTerm) ||
      item.sku?.toLowerCase().includes(lowerSearchTerm) ||
      item.category_name?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [locationStock, searchTerm]);

  const tableHeaderClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
  const tableDataClass = "px-6 py-4 text-sm text-gray-900";

  return (
    <div className="space-y-4">
      {/* Location Selector and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Location
          </label>
          <select
            value={selectedLocation || ''}
            onChange={(e) => setSelectedLocation(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {godowns.length === 0 ? (
              <option value="">No locations available</option>
            ) : (
              godowns.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code}) {g.is_default === 1 ? '- Default' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Items
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stock Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading stock...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className={tableHeaderClass}>Item Name</th>
                <th scope="col" className={tableHeaderClass}>SKU</th>
                <th scope="col" className={tableHeaderClass}>Category</th>
                <th scope="col" className={tableHeaderClass + ' text-right'}>Current Stock</th>
                <th scope="col" className={tableHeaderClass + ' text-right'}>Available Stock</th>
                <th scope="col" className={tableHeaderClass + ' text-right'}>MRP</th>
                <th scope="col" className={tableHeaderClass + ' text-right'}>Sale Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No items found matching your search.' : 'No stock available at this location.'}
                  </td>
                </tr>
              ) : (
                filteredStock.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50">
                    <td className={tableDataClass + ' font-medium'}>
                      {item.item_name}
                    </td>
                    <td className={tableDataClass + ' text-gray-600'}>
                      {item.sku || '-'}
                    </td>
                    <td className={tableDataClass + ' text-gray-600'}>
                      {item.category_name || '-'}
                    </td>
                    <td className={tableDataClass + ' text-right font-bold'}>
                      <span className={item.current_stock <= 0 ? 'text-red-600' : 'text-green-600'}>
                        {item.current_stock || 0} {item.unit || 'pcs'}
                      </span>
                    </td>
                    <td className={tableDataClass + ' text-right'}>
                      {item.available_stock || 0} {item.unit || 'pcs'}
                    </td>
                    <td className={tableDataClass + ' text-right'}>
                      ₹{item.mrp || 0}
                    </td>
                    <td className={tableDataClass + ' text-right'}>
                      ₹{item.sale_rate || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredStock.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="3" className="px-6 py-3 text-sm font-semibold text-gray-900">
                    Total Items: {filteredStock.length}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    Total Stock: {filteredStock.reduce((sum, item) => sum + (item.current_stock || 0), 0)}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

export default BranchGoDown;
