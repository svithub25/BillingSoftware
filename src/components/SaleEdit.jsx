import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar, DollarSign, FileText, Phone, MapPin, Plus, Trash2, Save, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';

// --- PIN Modal (same as in Backup.jsx) ---
import PinProtected from './reusables/PinProtected';

// --- End PIN Modal ---

const ConfirmModal = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-4">Confirm Update</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-3"> 
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onConfirm}
          >
            Yes, Update
          </button>
        </div>
      </div>
    </div>
  );
};

const SaleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- Salesmen state ---
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState('');

  // Editable fields
  const [form, setForm] = useState({
    bill_number: '',
    customer_name: '',
    customer_contact: '',
    customer_address: '',
    customer_gstin: '',
    sale_date: '',
    discount: 0,
    items: []
  });

  // --- Shipped To state ---
  const [isShippedDifferent, setIsShippedDifferent] = useState(false);
  const [shippedToInfo, setShippedToInfo] = useState({
    name: '',
    contact: '',
    address: '',
    gstin: ''
  });

  useEffect(() => {
    loadSaleDetails();
    window.electronAPI.getInventory().then(setItems);
    // Load salesmen
    window.electronAPI.getSalesmen().then(list => setSalesmen(list));
    // eslint-disable-next-line
  }, [id]);

  const loadSaleDetails = async () => { 
    setLoading(true);
    try {
      const result = await window.electronAPI.getSaleDetails(parseInt(id));
      console.log('Fetched sale details:', result);  
      setSale(result); 
      setForm({
        bill_number: result.bill_number,
        customer_name: result.customer_name || '',
        customer_contact: result.customer_contact || '',
        customer_address: result.customer_address || '',
        customer_gstin: result.customer_gstin || '',
        sale_date: result.sale_date,
        discount: result.discount || 0,
        items: result.items.map(item => ({
          id: item.item_id,
          name: item.item_name,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          saved_unit_price: item.unit_price
        }))
      });
      setSelectedSalesman(result.salesman_id || '');
      setIsShippedDifferent(result.is_shipped_different === 1);
      setShippedToInfo({
        name: result.shipped_to_name || '',
        contact: result.shipped_to_contact || '',
        address: result.shipped_to_address || '',
        gstin: result.shipped_to_gstin || ''
      });
    } catch (error) {
      toast.error('Error loading sale details');
    } finally {
      setLoading(false);
    }
  };

  // Item dropdown logic (for adding new items)
  const [itemSearch, setItemSearch] = useState(''); 
  const [showItemList, setShowItemList] = useState(false);
  const [itemDropdownIndex, setItemDropdownIndex] = useState(0);
  const itemInputRef = useRef();
 
  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.sku && i.sku.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const handleItemInputKeyDown = (e) => {
    if (showItemList && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        setItemDropdownIndex(idx => (idx + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        setItemDropdownIndex(idx => (idx - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        addItemToSale(filteredItems[itemDropdownIndex]);
      }
    }
  };

  const addItemToSale = (item) => {
    if (!item) return;
    if (form.items.some(i => i.id === item.id)) {
      toast.warn('Item already in sale');
      setShowItemList(false);
      setItemSearch('');
      return;
    }
    const rate = item.mrp || 0;
    setForm(f => ({
      ...f,
      items: [
        ...f.items,
        {
          id: item.id,
          name: item.name,
          hsn_code: item.hsn_code,
          quantity: '',
          unit_price: rate,
          total_price: 0
        }
      ]
    }));
    setShowItemList(false);
    setItemSearch('');
    setItemDropdownIndex(0);
    setTimeout(() => {
      document.getElementById(`qty-input-${form.items.length}`)?.focus();
    }, 0);
  };

  const updateSaleItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx][field] = value;
      
      // Recalculate total_price when quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(items[idx].quantity) || 0;
        const rate = parseFloat(items[idx].unit_price) || 0;
        items[idx].total_price = qty * rate;
      }
      
      return { ...f, items };
    });
  };

  const removeSaleItem = (idx) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx)
    }));
  };

  // Reset price to saved price
  const resetPriceToOriginal = (idx) => {
    setForm(f => {
      const items = [...f.items];
      const item = items[idx];
      
      if (item.saved_unit_price) {
        items[idx].unit_price = item.saved_unit_price;
        items[idx].total_price = (parseFloat(items[idx].quantity) || 0) * item.saved_unit_price;
        toast.success('Price reset to original saved price');
      } else {
        toast.error('Original price not found');
      }
      
      return { ...f, items };
    });
  };

  // Calculate subtotal
  const getSubtotal = () =>
    form.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);

  // Calculate discount amount
  const getDiscountAmount = () => (getSubtotal() * (parseFloat(form.discount) || 0)) / 100;

  // Calculate final amount before rounding
  const getAmountBeforeRounding = () => getSubtotal() - getDiscountAmount();

  // Rounding off
  const getRoundingOff = () => +(Math.round(getAmountBeforeRounding()) - getAmountBeforeRounding()).toFixed(2);

  // Final total
  const getFinalAmount = () => Math.round(getAmountBeforeRounding());

  const handleSave = async () => {
    // Validate
    if (!form.bill_number || !form.sale_date || form.items.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    const validItems = form.items.filter(
      item =>
        item.id &&
        item.name &&
        item.quantity &&
        item.unit_price &&
        parseFloat(item.quantity) > 0 &&
        parseFloat(item.unit_price) > 0
    );
    if (validItems.length === 0) {
      toast.error('Please enter at least one valid item');
      return;
    }
 
    // --- STOCK VALIDATION ---
    for (const item of validItems) {
      const stockItem = items.find(i => i.id === item.id);
      // Find the original quantity from the loaded sale
      const originalSaleItem = sale?.items?.find(si => si.item_id === item.id);
      const originalQty = originalSaleItem ? parseInt(originalSaleItem.quantity) : 0;
      const maxAllowedQty = (stockItem?.current_stock || 0) + originalQty;

      if (parseInt(item.quantity) > maxAllowedQty) {
        toast.error(
          `Insufficient stock for ${item.name}. Available for sale: ${maxAllowedQty} (Current stock: ${stockItem?.current_stock || 0}, Previously sold: ${originalQty})`
        );
        return;
      } 
    }
    // --- END STOCK VALIDATION ---

    try {
      await window.electronAPI.updateSale(parseInt(id), {
        ...form, 
        items: form.items,
        total_amount: getFinalAmount(),
        rounding_off: getRoundingOff(),
        salesman_id: selectedSalesman || null,
        sale_type: sale?.sale_type || 'customer',
        is_shipped_different: isShippedDifferent ? 1 : 0,
        shipped_to_name: isShippedDifferent ? shippedToInfo.name : '',
        shipped_to_contact: isShippedDifferent ? shippedToInfo.contact : '',
        shipped_to_address: isShippedDifferent ? shippedToInfo.address : '',
        shipped_to_gstin: isShippedDifferent ? shippedToInfo.gstin : ''
      });
      toast.success('Sale updated successfully!');
      navigate('/sales-history');
    } catch (error) {
      toast.error('Error updating sale');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sale details...</div>
      </div>
    );
  }

  return (
    // <PinProtected message="This module is protected and requires PIN verification to access." modulename='Sales Edit'>
      <div className="p-6">
        <ConfirmModal
          open={confirmOpen}
          message="Do you want to save this sale? This will affect the current inventory and can affect past reports."
          onConfirm={() => {
            setConfirmOpen(false);
            handleSave();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/sales-history')}
            className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Sales
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Edit Sale</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                type="text"
                value={form.bill_number}
                onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.sale_date}
                onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input
                type="text"
                value={form.customer_contact}
                onChange={e => setForm(f => ({ ...f, customer_contact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.customer_address}
                onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={form.customer_gstin}
                onChange={e => setForm(f => ({ ...f, customer_gstin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
              {/* Shipped To Section */}
          <div className="col-span-2 mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isShippedDifferent}
                onChange={e => {
                  setIsShippedDifferent(e.target.checked);
                  if (!e.target.checked) {
                    setShippedToInfo({ name: '', contact: '', address: '', gstin: '' });
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Ship to a different address
              </span>
            </label>
          </div>
          {isShippedDifferent && (
           <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipped To Name</label>
                <input
                  type="text"
                  value={shippedToInfo.name}
                  onChange={e => setShippedToInfo({ ...shippedToInfo, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipped To Contact</label>
                <input
                  type="text"
                  value={shippedToInfo.contact}
                  onChange={e => setShippedToInfo({ ...shippedToInfo, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipped To Address</label>
                <input
                  type="text"
                  value={shippedToInfo.address}
                  onChange={e => setShippedToInfo({ ...shippedToInfo, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipped To GSTIN</label>
                <input
                  type="text"
                  value={shippedToInfo.gstin}
                  onChange={e => setShippedToInfo({ ...shippedToInfo, gstin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
           </>
          )}
            {/* Salesman Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salesman</label>
              <select
                value={selectedSalesman}
                onChange={e => setSelectedSalesman(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Salesman</option>
                {salesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Item</label>
            <div className="relative">
              <input
                ref={itemInputRef}
                type="text"
                value={itemSearch}
                onChange={e => {
                  setItemSearch(e.target.value);
                  setShowItemList(true);
                  setItemDropdownIndex(0);
                }}
                onFocus={() => setShowItemList(true)}
                onBlur={() => setTimeout(() => setShowItemList(false), 100)}
                onKeyDown={handleItemInputKeyDown}
                placeholder="Type to search item"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="off"
              />
              {showItemList && filteredItems.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                  {filteredItems.map((itm, idx) => (
                    <li
                      key={itm.id}
                      className={`px-3 py-2 cursor-pointer ${idx === itemDropdownIndex ? 'bg-blue-100' : ''}`}
                      onMouseDown={() => addItemToSale(itm)}
                      tabIndex={-1}
                    >
                      {itm.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">HSN Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rate</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => {
                  return (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.hsn_code || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <input
                          id={`qty-input-${idx}`}
                          type="number"
                          onWheel={e => e.target.blur()}
                          value={item.quantity}
                          min={1}
                          onChange={e => updateSaleItem(idx, 'quantity', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            onWheel={e => e.target.blur()}
                            value={item.unit_price}
                            min={0}
                            onChange={e => updateSaleItem(idx, 'unit_price', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="₹0.00"
                          />
                          <button
                            onClick={() => resetPriceToOriginal(idx)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                            title="Reset to original saved price"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-semibold">₹{item.total_price?.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeSaleItem(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discount and Totals */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-4 border-t border-gray-200 gap-4">
            <div className="flex flex-col items-end space-y-1 order-1 md:order-2 w-full md:w-auto">
              <div className="flex justify-between w-full md:w-auto">
                <span className="font-medium text-gray-700 mr-2">Subtotal:</span>
                <span>₹{getSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between w-full md:w-auto">
                <span className="font-medium text-gray-700 mr-2">Discount (%):</span>
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  value={form.discount}
                  min={0}
                  max={100}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div className="flex justify-between w-full md:w-auto">
                <span className="font-medium text-gray-700 mr-2">Amount Before Rounding:</span>
                <span>₹{getAmountBeforeRounding().toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full md:w-auto">
                <span className="font-medium text-gray-700 mr-2">Rounding Off:</span>
                <span>{getRoundingOff() > 0 ? '+' : '-'}₹{Math.abs(getRoundingOff()).toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full md:w-auto text-lg font-semibold border-t border-gray-200 pt-2">
                <span>Final Amount:</span>
                <span>₹{getFinalAmount().toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors order-2 md:order-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Sale
            </button>
          </div>

        
        </div>
      </div>
    // </PinProtected>
  ); 
};

export default SaleEdit;