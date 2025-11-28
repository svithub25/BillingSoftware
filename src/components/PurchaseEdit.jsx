import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, History ,ArrowLeft} from 'lucide-react';
import { toast } from 'react-toastify';
import ReactDOM from 'react-dom'; 

const DropdownPortal = ({ children, anchorRef, show }) => {
  const [style, setStyle] = useState({});
  useEffect(() => {
    if (show && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [show, anchorRef]);
  if (!show) return null;
  return ReactDOM.createPortal(
    <div style={style}>{children}</div>,
    document.body
  );
};

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

const PurchaseEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    invoice_number: '',
    purchase_date: '',
    items: []
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Supplier dropdown
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [supplierDropdownIndex, setSupplierDropdownIndex] = useState(0);
  const supplierInputRef = useRef();

  // Item dropdowns
  const [itemSearch, setItemSearch] = useState({});
  const [showItemList, setShowItemList] = useState({});
  const [itemDropdownIndex, setItemDropdownIndex] = useState({});
  const itemInputRefs = useRef({});

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [suppliersData, itemsData, purchaseData] = await Promise.all([
          window.electronAPI.getSuppliers(),
          window.electronAPI.getInventory(),
          window.electronAPI.getPurchaseDetails(parseInt(id)) 
        ]);
        setSuppliers(suppliersData);
        setItems(itemsData);
       // When loading purchase data
          setPurchaseForm({
            supplier_id: purchaseData.purchase.supplier_id,
            invoice_number: purchaseData.purchase.invoice_number,
            purchase_date: purchaseData.purchase.purchase_date,
            discount: purchaseData.purchase.discount || 0, // <-- add this line
            items: purchaseData.items.map(item => ({
              id: item.item_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              gst_percentage: item.gst_percentage,
              discount: item.discount || 0, // <-- add this line
              total_price: item.total_price
            }))
          });  
        setSupplierSearch(
          suppliersData.find(s => s.id === purchaseData.purchase.supplier_id)?.name || ''
        );
      } catch (error) {
        toast.error('Error loading purchase details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Supplier dropdown logic
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );
  const handleSupplierInputKeyDown = (e) => {
    if (showSupplierList && filteredSuppliers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSupplierDropdownIndex(prev =>
          prev < filteredSuppliers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSupplierDropdownIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuppliers.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredSuppliers[supplierDropdownIndex]) {
          handleSupplierSelect(filteredSuppliers[supplierDropdownIndex]);
          e.preventDefault();
          document.getElementById('invoice-input')?.focus();
        }
      } else if (e.key === 'Escape') {
        setShowSupplierList(false);
      }
    }
  };
  const handleSupplierSelect = (supplier) => {
    setPurchaseForm({ ...purchaseForm, supplier_id: supplier.id });
    setSupplierSearch(supplier.name);
    setShowSupplierList(false);
    setSupplierDropdownIndex(0);
  };

  // Item dropdown logic
const getFilteredItems = (search) =>
  items.filter(i =>
    i.name.toLowerCase().includes((search || '').toLowerCase()) ||
    (i.sku && i.sku.toLowerCase().includes((search || '').toLowerCase()))
  ); 
   
  const handleItemInputKeyDown = (e, rowIdx) => {
    const filtered = getFilteredItems(itemSearch[rowIdx]);
    if (showItemList[rowIdx] && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setItemDropdownIndex(idx => ({
          ...idx,
          [rowIdx]: idx[rowIdx] < filtered.length - 1 ? idx[rowIdx] + 1 : 0
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setItemDropdownIndex(idx => ({
          ...idx,
          [rowIdx]: idx[rowIdx] > 0 ? idx[rowIdx] - 1 : filtered.length - 1
        }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered[itemDropdownIndex[rowIdx] || 0]) {
          handleItemSelect(filtered[itemDropdownIndex[rowIdx] || 0], rowIdx);
          e.preventDefault();
          document.getElementById(`qty-input-${rowIdx}`)?.focus();
        }
      } else if (e.key === 'Escape') {
        setShowItemList(list => ({ ...list, [rowIdx]: false }));
      }
    }
    if (e.key === 'Delete') {
      removePurchaseItem(rowIdx);
    }
  };
  const handleItemSelect = (item, rowIdx) => {
    const updatedItems = [...purchaseForm.items];
    updatedItems[rowIdx].id = item.id;
    updatedItems[rowIdx].gst_percentage = item.gst_percentage;
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
    setItemSearch(search => ({ ...search, [rowIdx]: item.name }));
    setShowItemList(list => ({ ...list, [rowIdx]: false }));
    setItemDropdownIndex(idx => ({ ...idx, [rowIdx]: 0 }));
  };

  // Update item in form
  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...purchaseForm.items];
    updatedItems[index][field] = value;
    // Recalculate total_price and GST
    const selectedItem = items.find(i => i.id == updatedItems[index].id);
    const gstRate = selectedItem?.gst_percentage || 0;
    const qty = parseFloat(updatedItems[index].quantity) || 0;
    const rate = parseFloat(updatedItems[index].unit_price) || 0;
    const baseAmount = qty * rate;
    const cgstAmount = (baseAmount * gstRate) / 200;
    const sgstAmount = (baseAmount * gstRate) / 200;
    updatedItems[index].cgst_amount = cgstAmount;
    updatedItems[index].sgst_amount = sgstAmount;
    updatedItems[index].total_price = baseAmount + cgstAmount + sgstAmount;
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
  };

  // Remove item
  const removePurchaseItem = (index) => {
    const updatedItems = purchaseForm.items.filter((_, i) => i !== index);
    // Remove related search/dropdown state for this row
    const newItemSearch = { ...itemSearch };
    const newShowItemList = { ...showItemList };
    const newItemDropdownIndex = { ...itemDropdownIndex };
    delete newItemSearch[index];
    delete newShowItemList[index];
    delete newItemDropdownIndex[index];
    // Shift keys for rows after the deleted one
    const shiftKeys = (obj) => {
      const shifted = {};
      Object.keys(obj).forEach(key => {
        const k = parseInt(key, 10);
        if (k < index) shifted[k] = obj[k];
        else if (k > index) shifted[k - 1] = obj[k];
      });
      return shifted;
    };
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
    setItemSearch(shiftKeys(newItemSearch));
    setShowItemList(shiftKeys(newShowItemList));
    setItemDropdownIndex(shiftKeys(newItemDropdownIndex));
  };

  // Add new item row
  const addItemToPurchase = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { id: '', quantity: 1, unit_price: 0, total_price: 0 }]
    });
  };

  // Calculate totals for display and update
  const subtotal = purchaseForm.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const baseAmount = qty * rate;
    const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
    return sum + (baseAmount - itemDiscount);
  }, 0);

  const overallDiscountAmount = purchaseForm.discount ? (subtotal * purchaseForm.discount) / 100 : 0;
  const subtotalAfterOverallDiscount = subtotal - overallDiscountAmount;

  const cgst_total = purchaseForm.items.reduce((sum, item) => {
    const gstRate = item.gst_percentage || 0;
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const baseAmount = qty * rate;
    const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
    const discountedAmount = baseAmount - itemDiscount;
    return sum + (discountedAmount * gstRate) / 200;
  }, 0);

  const sgst_total = purchaseForm.items.reduce((sum, item) => {
    const gstRate = item.gst_percentage || 0;
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const baseAmount = qty * rate;
    const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
    const discountedAmount = baseAmount - itemDiscount;
    return sum + (discountedAmount * gstRate) / 200;
  }, 0);

  const gstTotal = cgst_total + sgst_total;
  const totalWithGst = subtotalAfterOverallDiscount + gstTotal;
  const rounding_off = +(Math.round(totalWithGst) - totalWithGst).toFixed(2);
  const grandTotal = Math.round(totalWithGst);

  // Save/Update purchase
  const updatePurchase = async () => {
    // Filter out invalid items
    const validItems = purchaseForm.items.filter(item => {
      const selectedItem = items.find(i => i.id == item.id);
      return (
        selectedItem &&
        selectedItem.name &&
        item.quantity && item.quantity > 0 &&
        item.unit_price && item.unit_price > 0
      );
    });

    if (validItems.length === 0) {
      toast.error('Please enter at least one valid item (with name, quantity, and unit price)');
      return;
    }

    // Calculate GST for each valid item
    const itemsWithGST = validItems.map(item => {
      const selectedItem = items.find(i => i.id == item.id);
      const baseAmount = item.quantity * item.unit_price;
      const gstRate = selectedItem?.gst_percentage || 0;
      const cgstAmount = (baseAmount * gstRate) / 200;
      const sgstAmount = (baseAmount * gstRate) / 200;
      const totalPrice = baseAmount + cgstAmount + sgstAmount;
      return {
        ...item,
        gst_percentage: gstRate,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        total_price: totalPrice
      };
    });

    // --- NEW: Check if stock will go negative ---
    const check = await window.electronAPI.checkPurchaseEditStock(id, itemsWithGST);
    console.log(id , itemsWithGST)
    console.log(check) 
    if (!check.ok) {
      toast.error(check.message || 'Stock will go negative for one or more items.');
      return;
    }
    // --- END NEW ---

    try {
      const data =  await window.electronAPI.updatePurchase(id, {
        ...purchaseForm,
        items: itemsWithGST,
        cgst_total,
        sgst_total,
        rounding_off,
        total_amount: grandTotal
      });
      console.log('the saadasdasdad',data);
      toast.success('Purchase updated successfully!'); 
      navigate('/purchase-history');
    } catch (error) {
      toast.error('Error updating purchase: ' + error);
      
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      
          <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/purchase-history')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Purchase
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Edit Purchase</h1>
         
      </div>
      
    

      {/* Purchase Edit Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Purchase</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Supplier Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
            <div className="relative">
              <input
                ref={supplierInputRef}
                type="text"
                value={supplierSearch}
                onChange={e => {
                  setSupplierSearch(e.target.value);
                  setShowSupplierList(true);
                  setSupplierDropdownIndex(0);
                  const match = suppliers.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                  setPurchaseForm({ ...purchaseForm, supplier_id: match ? match.id : '' });
                }}
                onFocus={() => setShowSupplierList(true)}
                onBlur={() => setTimeout(() => setShowSupplierList(false), 100)}
                onKeyDown={handleSupplierInputKeyDown}
                placeholder="Type to search supplier"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                tabIndex={0}
              />
              {showSupplierList && filteredSuppliers.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                  {filteredSuppliers.map((supplier, idx) => (
                    <li
                      key={supplier.id}
                      className={`px-3 py-2 cursor-pointer ${idx === supplierDropdownIndex ? 'bg-blue-100' : ''}`}
                      onMouseDown={() => handleSupplierSelect(supplier)}
                      tabIndex={-1}
                    >
                      {supplier.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
            <input
              id="invoice-input"
              type="text"
              value={purchaseForm.invoice_number}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter invoice number"
              tabIndex={0}
            />
          </div>
          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
            <input
              type="date"
              value={purchaseForm.purchase_date}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              tabIndex={0}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-gray-900">Items</h3>
            <button
              onClick={addItemToPurchase}
              className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </button>
          </div>
          {purchaseForm.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                   
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount (%)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discounted Amount</th>
                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total (With GST)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseForm.items.map((item, index) => {
                    const selectedItem = items.find(i => i.id == item.id);
                    const MRP = selectedItem?.mrp || 0;
                    const gstRate = selectedItem?.gst_percentage || 0;
                    const baseAmount = item.quantity * item.unit_price;
                    const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
                    const discountedAmount = baseAmount - itemDiscount;
                    const gstAmount = (discountedAmount * gstRate) / 100;
                    const totalWithGst = discountedAmount + gstAmount;
                    const filtered = getFilteredItems(itemSearch[index]);
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              ref={el => (itemInputRefs.current[index] = el)}
                              type="text"
                              value={itemSearch[index] || (selectedItem?.name || '')}
                              onChange={e => {
                                const value = e.target.value;
                                setItemSearch(search => ({ ...search, [index]: value }));
                                setShowItemList(list => ({ ...list, [index]: true }));
                                setItemDropdownIndex(idx => ({ ...idx, [index]: 0 }));
                                if (value.trim() !== '') {
                                  const match = items.find(i => i.name.toLowerCase() === value.toLowerCase());
                                  if (match) {
                                    const updatedItems = [...purchaseForm.items];
                                    updatedItems[index].id = match.id;
                                    setPurchaseForm({ ...purchaseForm, items: updatedItems });
                                  }
                                } else {
                                  const updatedItems = [...purchaseForm.items];
                                  updatedItems[index].id = '';
                                  setPurchaseForm({ ...purchaseForm, items: updatedItems });
                                }
                              }}
                              onFocus={() => setShowItemList(list => ({ ...list, [index]: true }))}
                              onBlur={() => setTimeout(() => setShowItemList(list => ({ ...list, [index]: false })), 100)}
                              onKeyDown={e => {
                                const filtered = getFilteredItems(itemSearch[index]);
                                if ((e.key === 'Enter' || e.key === 'Tab') && filtered.length > 0) {
                                  handleItemSelect(filtered[itemDropdownIndex[index] || 0] || filtered[0], index);
                                  e.preventDefault();
                                  document.getElementById(`qty-input-${index}`)?.focus();
                                } else {
                                  handleItemInputKeyDown(e, index);
                                }
                              }}
                              placeholder="Type to search item"
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              autoComplete="off"
                              tabIndex={0}
                            />
                            <DropdownPortal
                              anchorRef={{ current: itemInputRefs.current[index] }}
                              show={showItemList[index] && filtered.length > 0}
                            >
                              <ul
                                className="bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full"
                                style={{ minWidth: 180, maxHeight: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                              >
                                {filtered.map((itm, idx) => (
                                  <li
                                    key={itm.id}
                                    className={`px-3 py-2 cursor-pointer ${idx === (itemDropdownIndex[index] || 0) ? 'bg-blue-100' : ''}`}
                                    onMouseDown={() => handleItemSelect(itm, index)}
                                    tabIndex={-1}
                                  >
                                    {itm.name}
                                  </li>
                                ))}
                              </ul>
                            </DropdownPortal>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            id={`qty-input-${index}`}
                            type="number"
                            onWheel={e => e.target.blur()}
                            value={item.quantity}
                            onChange={(e) => updatePurchaseItem(index, 'quantity', parseInt(e.target.value))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Delete') removePurchaseItem(index);
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            onWheel={e => e.target.blur()}
                            value={item.unit_price}
                            onChange={(e) => updatePurchaseItem(index, 'unit_price', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Delete') removePurchaseItem(index);
                              if (e.key === 'Tab' && !e.shiftKey) {
                                addItemToPurchase();
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">₹{MRP}</span>
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            ₹{baseAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.discount || 0}
                            onChange={e => updatePurchaseItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max="100"
                            placeholder="%"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            ₹{discountedAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">{gstRate}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            ₹{gstAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            ₹{totalWithGst.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removePurchaseItem(index)}
                            className="text-red-600 hover:text-red-800"
                            tabIndex={-1}
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
          )}
        </div>

        {/* Discount and Totals */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Discount (%)</label>
            <input
              type="number"
              value={purchaseForm.discount || 0}
              onChange={e => setPurchaseForm({ ...purchaseForm, discount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={0}
              max={100}
              placeholder="e.g. 5"
            />
          </div>
        </div> */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-4 border-t border-gray-200 gap-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors order-2 md:order-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Update Purchase
          </button>
          <div className="flex flex-col items-end space-y-1 order-1 md:order-2 w-full md:w-auto">
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">CGST:</span>
              <span>₹{cgst_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">SGST:</span>
              <span>₹{sgst_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Total (With GST):</span>
              <span>₹{totalWithGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Rounding Off:</span>
              <span>{rounding_off > 0 ? '-' : '+'}₹{Math.abs(rounding_off).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full md:w-auto text-lg font-semibold border-t border-gray-200 pt-2">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <ConfirmModal
          open={confirmOpen}
          message="Are you sure you want to update this purchase? As it can affect the current inventory and past billings."
          onConfirm={() => {
            setConfirmOpen(false);
            updatePurchase();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </div>
  );
};

export default PurchaseEdit;