import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar, DollarSign, FileText, Phone, MapPin, Plus, Trash2, Save, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';

// --- PIN Modal (same as in Backup.jsx) ---
import PinProtected from './reusables/PinProtected';
import BatchSelectModal from './BatchSelectModal';

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

  // --- Customers state ---
  const [customers, setCustomers] = useState([]);

  // Editable fields
  const [form, setForm] = useState({
    bill_number: '',
    contact_id: '',
    customer_name: '',
    customer_contact: '',
    customer_address: '',
    customer_gstin: '',
    sale_date: '',
    discount: 0,
    discount_type: 'percent',
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

  // --- Batch modal state ---
  const [batchModal, setBatchModal] = useState({ open: false, item: null, batches: [], cartIdx: null, existingSelections: null, isDuplicateRow: false });
  const [duplicateItemModal, setDuplicateItemModal] = useState({ open: false, item: null, existingItem: null });
  const [selectedBatches, setSelectedBatches] = useState({}); // { [itemId]: [{batch, qty}] }

  useEffect(() => {
    loadSaleDetails();
    window.electronAPI.getInventory().then(setItems);
    // Load salesmen
    window.electronAPI.getSalesmen().then(list => setSalesmen(list));
    // Load customers
    window.electronAPI.getCustomers().then(list => setCustomers(list || []));
    // eslint-disable-next-line
  }, [id]);

  // Update the loadSaleDetails function to ensure all items have batch structure
  const loadSaleDetails = async () => { 
    setLoading(true);
    try {
      const result = await window.electronAPI.getSaleDetails(parseInt(id));
      console.log('Fetched sale details:', result);  
      setSale(result); 
      setForm({
        bill_number: result.bill_number,
        contact_id: result.contact_id || '',
        customer_name: result.customer_name || '',
        customer_contact: result.customer_contact || '',
        customer_address: result.customer_address || '',
        customer_gstin: result.customer_gstin || '',
        sale_date: result.sale_date,
        discount: result.discount || 0,
        discount_type: result.discount_type || 'percent',
        items: result.items.map(item => ({
          id: item.item_id,
          cart_id: `${item.item_id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: item.item_name,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          saved_unit_price: item.unit_price,
          discount: item.discount || 0,
          discount_type: item.discount_type || 'percent',
          gst_percentage: item.gst_percentage || 0,
          unit: item.unit || '',
          // If no batches from DB, create a "No Batch" structure for consistency
          batches: (item.batches && item.batches.length > 0) 
            ? item.batches 
            : [{
                batch_id: null,
                batch_number: 'No Batch',
                qty: item.quantity,
                mfg_date: null,
                exp_date: null,
                purchase_rate: item.unit_price,
                mrp: item.unit_price
              }]
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

  // Fetch item batches
  const fetchItemBatches = async (itemId) => {
    return await window.electronAPI.getItemBatches(itemId);
  };

  // Update the addItemToSale function to always open batch modal
  const getAdjustedStockForModal = (item, batches, excludeCartIdx = null) => {
    const originalSaleItems = sale?.items?.filter(si => si.item_id === item.id) || [];
    const originalTotalQty = originalSaleItems.reduce((sum, si) => sum + (parseInt(si.quantity) || 0), 0);
    const originalBatchQtyMap = {};
    originalSaleItems.forEach(si => {
      if (si.batches && si.batches.length > 0) {
        si.batches.forEach(b => {
          const bKey = b.batch_id ? `${b.batch_id}` : (b.batch_number || 'No Batch');
          originalBatchQtyMap[bKey] = (originalBatchQtyMap[bKey] || 0) + (parseInt(b.qty) || 0);
        });
      } else {
        originalBatchQtyMap['No Batch'] = (originalBatchQtyMap['No Batch'] || 0) + (parseInt(si.quantity) || 0);
      }
    });

    let usedTotalQty = 0;
    const usedBatchQty = {};

    form.items.forEach((c, idx) => {
      if (c.id === item.id && (excludeCartIdx === null || idx !== excludeCartIdx)) {
        const rowQty = parseInt(c.quantity) || 0;
        usedTotalQty += rowQty;
        if (c.batches && c.batches.length > 0) {
          c.batches.forEach(b => {
            const bKey = b.batch_id ? `${b.batch_id}` : (b.batch_number || 'No Batch');
            usedBatchQty[bKey] = (usedBatchQty[bKey] || 0) + (parseInt(b.qty) || 0);
          });
        } else {
          usedBatchQty['No Batch'] = (usedBatchQty['No Batch'] || 0) + rowQty;
        }
      }
    });

    const totalAvailableGeneral = (parseInt(item.current_stock) || 0) + originalTotalQty;
    const adjustedCurrentStock = Math.max(0, totalAvailableGeneral - usedTotalQty);

    const adjustedBatches = (batches || []).map(b => {
      const bKey = b.id ? `${b.id}` : (b.batch_number || 'No Batch');
      const origQty = parseInt(b.qty_available) || 0;
      const origSold = originalBatchQtyMap[bKey] || 0;
      const used = usedBatchQty[bKey] || 0;
      return {
        ...b,
        qty_available: Math.max(0, origQty + origSold - used)
      };
    });

    return {
      adjustedItem: { ...item, current_stock: adjustedCurrentStock },
      adjustedBatches
    };
  };

  const addItemToSale = async (item) => {
    if (!item) return;

    // Check if item already exists in cart
    const existingCartItem = form.items.find(i => i.id === item.id);
    if (existingCartItem) {
      setDuplicateItemModal({ open: true, item, existingItem: existingCartItem });
      return;
    }

    const batches = await fetchItemBatches(item.id);
    const { adjustedItem, adjustedBatches } = getAdjustedStockForModal(item, batches, null);
    
    setBatchModal({ 
      open: true, 
      item: adjustedItem, 
      batches: adjustedBatches || [], 
      cartIdx: form.items.length, 
      existingSelections: null,
      isDuplicateRow: false
    });
    setShowItemList(false);
    setItemSearch('');
  };

  const proceedAddItemAsNew = async (item) => {
    setDuplicateItemModal({ open: false, item: null, existingItem: null });
    const batches = await fetchItemBatches(item.id);
    const { adjustedItem, adjustedBatches } = getAdjustedStockForModal(item, batches, null);
    
    const totalRemainingBatchStock = adjustedBatches.reduce((sum, b) => sum + (parseInt(b.qty_available) || 0), 0);
    const hasRemainingStock = adjustedItem.current_stock > 0 || totalRemainingBatchStock > 0;
    if (!hasRemainingStock) {
      toast.error(`No remaining stock available for ${item.name}. All available stock is already in the sale.`);
      return;
    }

    setBatchModal({ 
      open: true, 
      item: adjustedItem, 
      batches: adjustedBatches || [], 
      cartIdx: form.items.length, 
      existingSelections: null,
      isDuplicateRow: true
    });
    setShowItemList(false);
    setItemSearch('');
  };

  const getCartKey = (item) => item.cart_id || item.id;

  const addSplitRow = (item) => {
    proceedAddItemAsNew(item);
  };

  // Handle batch selection and add to cart or update existing cart item
  const handleBatchSelection = (cartIdx, item, batchSelections) => {
    setBatchModal({ open: false, item: null, batches: [], cartIdx: null, existingSelections: null, isDuplicateRow: false });

    // Group selected batches by rate (MRP)
    const batchesByRate = {};
    batchSelections.forEach(b => {
      const qty = Number(b.qty) || 0;
      if (qty <= 0) return;
      const rate = b.batch ? Number(b.batch.mrp) : Number(item.mrp || item.unit_price || 0);
      const key = `${rate}`;
      if (!batchesByRate[key]) {
        batchesByRate[key] = { rate, batches: [], totalQty: 0 };
      }
      batchesByRate[key].batches.push(b);
      batchesByRate[key].totalQty += qty;
    });

    const rateGroups = Object.values(batchesByRate);
    if (rateGroups.length === 0) return;

    const newCartItems = rateGroups.map((group, index) => {
      const isFirst = index === 0;
      const cartId = isFirst && item.cart_id ? item.cart_id : `${item.id}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: item.id,
        cart_id: cartId,
        name: item.name,
        hsn_code: item.hsn_code,
        quantity: group.totalQty,
        unit_price: group.rate,
        total_price: group.totalQty * group.rate,
        saved_unit_price: group.rate,
        discount: item.discount || 0,
        discount_type: item.discount_type || 'percent',
        gst_percentage: item.gst_percentage || 0,
        unit: item.unit || '',
        batches: group.batches.map(b => ({
          batch_id: b.batch ? b.batch.id : null,
          batch_number: b.batch ? b.batch.batch_number : 'No Batch',
          qty: b.qty,
          qty_available: b.batch ? (b.batch.qty_available !== undefined ? b.batch.qty_available : (item.current_stock || 0)) : (item.current_stock || 0),
          mfg_date: b.batch ? b.batch.mfg_date : null,
          exp_date: b.batch ? b.batch.exp_date : null,
          purchase_rate: b.batch ? b.batch.purchase_rate : item.purchase_rate,
          mrp: b.batch ? b.batch.mrp : item.mrp
        }))
      };
    });

    setForm(f => {
      let updatedItems = [...f.items];
      // Remove original item being modified
      updatedItems = updatedItems.filter(i => getCartKey(i) !== getCartKey(item));

      newCartItems.forEach(newItem => {
        const existingIdx = !batchModal.isDuplicateRow ? updatedItems.findIndex(i =>
          i.id === newItem.id &&
          Math.abs((i.unit_price || 0) - (newItem.unit_price || 0)) < 0.001 &&
          (i.discount || 0) === (newItem.discount || 0) &&
          (i.discount_type || 'percent') === (newItem.discount_type || 'percent')
        ) : -1;

        if (existingIdx > -1) {
          const existing = updatedItems[existingIdx];
          const mergedQty = (parseInt(existing.quantity) || 0) + (parseInt(newItem.quantity) || 0);
          const mergedBatches = [...(existing.batches || [])];
          (newItem.batches || []).forEach(nb => {
            const bIdx = mergedBatches.findIndex(mb => mb.batch_id === nb.batch_id && mb.batch_number === nb.batch_number);
            if (bIdx > -1) {
              mergedBatches[bIdx] = { ...mergedBatches[bIdx], qty: (parseInt(mergedBatches[bIdx].qty) || 0) + (parseInt(nb.qty) || 0) };
            } else {
              mergedBatches.push(nb);
            }
          });
          updatedItems[existingIdx] = {
            ...existing,
            quantity: mergedQty,
            total_price: mergedQty * existing.unit_price,
            batches: mergedBatches
          };
        } else {
          updatedItems.push(newItem);
        }
      });

      return { ...f, items: updatedItems };
    });

    setSelectedBatches(prev => ({ ...prev, [item.id]: batchSelections }));
  };

  // Reopen batch modal to edit selections
  const reopenBatchModal = async (cartItem) => {
    const batches = await fetchItemBatches(cartItem.id);
    
    // Find the full item object from inventory to get current_stock, mrp, etc.
    const fullItem = items.find(i => i.id === cartItem.id);
    
    if (!fullItem) {
      toast.error('Item not found in inventory');
      return;
    }
    
    // Convert cart item batches back to selection format
    const existingSelections = cartItem.batches?.map(b => ({
      batch_id: b.batch_id,
      qty: b.qty
    })) || [];

    const cartIdx = form.items.findIndex(c => getCartKey(c) === getCartKey(cartItem));
    const { adjustedItem, adjustedBatches } = getAdjustedStockForModal(fullItem, batches, cartIdx !== -1 ? cartIdx : null);

    setBatchModal({
      open: true,
      item: {
        ...adjustedItem,
        ...cartItem,
        name: cartItem.name,
        hsn_code: cartItem.hsn_code,
        current_stock: adjustedItem.current_stock
      },
      batches: adjustedBatches || [],
      cartIdx: cartIdx !== -1 ? cartIdx : null,
      existingSelections
    });
  };

  const updateSaleItem = (key, field, value) => {
    setForm(f => {
      const items = f.items.map(item => {
        if (getCartKey(item) !== key) return item;
        if (field === 'quantity') {
          toast.info('Click on quantity to edit batch selection');
          return item;
        }
        const updated = { ...item, [field]: value };
        if (field === 'unit_price') {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.unit_price) || 0;
          updated.total_price = qty * rate;
        }
        return updated;
      });
      return { ...f, items };
    });
  };

  const removeSaleItem = (key) => {
    const itemToRemove = form.items.find(i => getCartKey(i) === key);
    setForm(f => ({
      ...f,
      items: f.items.filter(i => getCartKey(i) !== key)
    }));
    if (itemToRemove && !form.items.some(i => i.id === itemToRemove.id && getCartKey(i) !== key)) {
      setSelectedBatches(prev => {
        const updated = { ...prev };
        delete updated[itemToRemove.id];
        return updated;
      });
    }
  };

  const resetPriceToOriginal = (key) => {
    setForm(f => {
      const items = f.items.map(item => {
        if (getCartKey(item) !== key) return item;
        if (item.saved_unit_price !== undefined && item.saved_unit_price !== null) {
          const updated = {
            ...item,
            unit_price: item.saved_unit_price,
            total_price: (parseFloat(item.quantity) || 0) * item.saved_unit_price
          };
          toast.success('Price reset to original saved price');
          return updated;
        } else {
          toast.error('Original price not found');
          return item;
        }
      });
      return { ...f, items };
    });
  };

  const calculateItemTotal = (item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const grossAmount = (item.unit_price || 0) * qty;
    const discVal = parseFloat(item.discount) || 0;
    const itemDiscountAmount = (item.discount_type || 'percent') === 'amount' ? Math.min(grossAmount, discVal) : (grossAmount * discVal) / 100;
    const baseAmount = Math.max(0, grossAmount - itemDiscountAmount);
    return { baseAmount, totalAmount: baseAmount };
  };

  // Calculate subtotal
  const getSubtotal = () =>
    form.items.reduce((sum, item) => sum + calculateItemTotal(item).baseAmount, 0);

  // Calculate discount amount
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    const discVal = parseFloat(form.discount) || 0;
    return (form.discount_type || 'percent') === 'amount' ? Math.min(sub, discVal) : (sub * discVal) / 100;
  };

  const getGstTotal = () => {
    const sub = getSubtotal();
    const overallDiscAmount = getDiscountAmount();
    const overallDiscountFactor = sub > 0 ? Math.max(0, 1 - (overallDiscAmount / sub)) : 1;
    return form.items.reduce((sum, item) => {
      const { baseAmount } = calculateItemTotal(item);
      const discountedBase = baseAmount * overallDiscountFactor;
      const gstRate = item.gst_percentage || 0;
      return sum + (discountedBase * gstRate) / 100;
    }, 0);
  };

  // Calculate final amount before rounding
  const getAmountBeforeRounding = () => Math.max(0, getSubtotal() - getDiscountAmount() + getGstTotal());

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
        item.unit_price !== undefined &&
        item.unit_price !== null &&
        parseFloat(item.quantity) > 0 &&
        parseFloat(item.unit_price) >= 0
    );
    if (validItems.length === 0) {
      toast.error('Please enter at least one valid item');
      return;
    }
 
    // --- STOCK VALIDATION ---
    const qtyByItemId = {};
    for (const item of validItems) {
      qtyByItemId[item.id] = (qtyByItemId[item.id] || 0) + parseInt(item.quantity || 0);
    }
    for (const itemIdStr of Object.keys(qtyByItemId)) {
      const itemId = parseInt(itemIdStr);
      const totalRequestedQty = qtyByItemId[itemId];
      const stockItem = items.find(i => i.id === itemId);
      const originalSaleItems = sale?.items?.filter(si => si.item_id === itemId) || [];
      const originalQty = originalSaleItems.reduce((sum, si) => sum + parseInt(si.quantity || 0), 0);
      const maxAllowedQty = (stockItem?.current_stock || 0) + originalQty;

      if (totalRequestedQty > maxAllowedQty) {
        toast.error(
          `Insufficient stock for ${stockItem?.name || 'item'}. Available for sale: ${maxAllowedQty} (Current stock: ${stockItem?.current_stock || 0}, Previously sold: ${originalQty})`
        );
        return;
      }
    }

    // Also validate batch quantities across all items
    const batchQtyMap = {};
    for (const item of validItems) {
      if (item.batches && item.batches.length > 0) {
        for (const b of item.batches) {
          if (b.batch_id) {
            const bKey = `${item.id}_${b.batch_id}`;
            batchQtyMap[bKey] = (batchQtyMap[bKey] || 0) + (parseInt(b.qty) || 0);
            if (b.qty_available !== undefined && batchQtyMap[bKey] > b.qty_available) {
              toast.error(`Insufficient stock for batch ${b.batch_number} of ${item.name}. Selected: ${batchQtyMap[bKey]}, Available: ${b.qty_available}`);
              return;
            }
          }
        }
      }
    }
    // --- END STOCK VALIDATION ---

    try {
      const sub = getSubtotal();
      const overallDiscAmount = getDiscountAmount();
      const overallDiscountFactor = sub > 0 ? Math.max(0, 1 - (overallDiscAmount / sub)) : 1;

      // Prepare items with batch and discount information
      const itemsToSave = form.items.map(item => {
        const qty = parseInt(item.quantity, 10) || 0;
        const { baseAmount } = calculateItemTotal({ ...item, quantity: qty });
        const discountedBase = baseAmount * overallDiscountFactor;
        const gstRate = item.gst_percentage || 0;
        const cgstAmount = (discountedBase * gstRate) / 200;
        const sgstAmount = (discountedBase * gstRate) / 200;
        const totalAmount = discountedBase + cgstAmount + sgstAmount;

        return {
          id: item.id,
          quantity: qty,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          discount_type: item.discount_type || 'percent',
          discount_amount: (item.discount_type || 'percent') === 'amount' ? Math.min((item.unit_price || 0) * qty, parseFloat(item.discount) || 0) : ((item.unit_price || 0) * qty * (parseFloat(item.discount) || 0)) / 100,
          gst_percentage: gstRate,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          total_price: totalAmount,
          batches: item.batches || []
        };
      });

      await window.electronAPI.updateSale(parseInt(id), {
        ...form,
        discount_amount: getDiscountAmount(),
        items: itemsToSave,
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
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={form.contact_id || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  const selectedCustomer = customers.find(c => String(c.id) === String(selectedId));
                  if (selectedCustomer) {
                    setForm(f => ({
                      ...f,
                      contact_id: selectedCustomer.id,
                      customer_name: selectedCustomer.name || '',
                      customer_contact: selectedCustomer.contact || '',
                      customer_address: selectedCustomer.address || '',
                      customer_gstin: selectedCustomer.gstin || ''
                    }));
                  } else {
                    setForm(f => ({
                      ...f,
                      contact_id: '',
                      customer_name: '',
                      customer_contact: '',
                      customer_address: '',
                      customer_gstin: ''
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.contact})</option>
                ))}
              </select>
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

          {/* Items List */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-800 border-b pb-2">Sale Items</h3>
            {form.items.map((item, idx) => {
              const key = getCartKey(item);
              const { totalAmount } = calculateItemTotal({ ...item, quantity: parseInt(item.quantity) || 0 });
              const batchText = item.batches && item.batches.length > 0
                ? item.batches.map(b => `${b.batch_number || 'No Batch'} (${b.qty})`).join(', ')
                : null;

              return (
                <div key={key} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => addSplitRow(item)}
                          className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium flex items-center gap-1"
                          title="Add another line for this item (e.g. Free item or different rate/discount)"
                        >
                          + Row
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">HSN: {item.hsn_code || 'N/A'}</div>
                      {batchText && (
                        <div
                          onClick={() => reopenBatchModal(item)}
                          className="text-xs text-blue-600 hover:underline cursor-pointer mt-0.5 truncate"
                          title="Click to change batch selection"
                        >
                          Batches: {batchText}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-right">₹{totalAmount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => removeSaleItem(key)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-gray-200">
                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <label className="text-gray-600 font-medium">Qty:</label>
                      <div
                        onClick={() => reopenBatchModal(item)}
                        className="w-12 px-1 py-1 border border-blue-300 bg-blue-50 rounded text-center cursor-pointer hover:bg-blue-100 font-semibold text-blue-700"
                        title="Click to edit batch/quantity selection"
                      >
                        {item.quantity}
                      </div>
                    </div>

                    {/* Rate Input */}
                    <div className="flex items-center gap-1">
                      <label className="text-gray-600 font-medium">Rate:</label>
                      <input
                        type="number"
                        step="0.01"
                        onWheel={e => e.target.blur()}
                        value={item.unit_price}
                        onChange={e => updateSaleItem(key, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-1 border border-gray-300 rounded bg-white"
                        placeholder="₹0.00"
                      />
                      <button
                        type="button"
                        onClick={() => resetPriceToOriginal(key)}
                        className="flex items-center text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"
                        title="Reset to original saved price"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Discount Input */}
                    <div className="flex items-center gap-1">
                      <label className="text-gray-600 font-medium">Disc:</label>
                      <input
                        type="number"
                        step="0.01"
                        onWheel={e => e.target.blur()}
                        value={item.discount || ''}
                        onChange={e => updateSaleItem(key, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-14 px-1 py-1 border border-gray-300 rounded bg-white"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newType = (item.discount_type || 'percent') === 'percent' ? 'amount' : 'percent';
                          updateSaleItem(key, 'discount_type', newType);
                        }}
                        className="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-semibold text-xs border border-gray-300"
                        title="Toggle between % and ₹"
                      >
                        {(item.discount_type || 'percent') === 'amount' ? '₹' : '%'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Discount and Totals */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between pt-6 border-t border-gray-200 gap-6">
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors order-2 md:order-1 shadow"
            >
              <Save className="w-5 h-5 mr-2" />
              Update Sale
            </button>

            <div className="flex flex-col items-end space-y-2 order-1 md:order-2 w-full md:w-80 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between w-full text-sm">
                <span className="font-medium text-gray-700">Subtotal:</span>
                <span className="font-semibold">₹{getSubtotal().toFixed(2)}</span>
              </div>
              
              <div className="w-full pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    Overall Discount ({(form.discount_type || 'percent') === 'amount' ? '₹' : '%'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, discount_type: (f.discount_type || 'percent') === 'amount' ? 'percent' : 'amount' }))}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded font-medium"
                  >
                    Switch to {(form.discount_type || 'percent') === 'amount' ? '%' : '₹'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    onWheel={e => e.target.blur()}
                    value={form.discount || ''}
                    min={0}
                    max={(form.discount_type || 'percent') === 'amount' ? getSubtotal() : 100}
                    onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                    placeholder="0"
                  />
                  {parseFloat(form.discount) > 0 && (
                    <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                      -₹{getDiscountAmount().toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {getGstTotal() > 0 && (
                <div className="flex justify-between w-full text-sm pt-1">
                  <span className="font-medium text-gray-700">Total GST:</span>
                  <span className="font-semibold">₹{getGstTotal().toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between w-full text-sm">
                <span className="font-medium text-gray-700">Amount Before Rounding:</span>
                <span>₹{getAmountBeforeRounding().toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full text-sm">
                <span className="font-medium text-gray-700">Rounding Off:</span>
                <span>{getRoundingOff() >= 0 ? '+' : ''}₹{getRoundingOff().toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full text-lg font-bold border-t border-gray-300 pt-2 text-gray-900">
                <span>Final Amount:</span>
                <span>₹{getFinalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>


        </div>

        {/* Duplicate Item Choice Modal */}
        {duplicateItemModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Item Already in Bill</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{duplicateItemModal.item?.name}</span> is already added to this bill. How would you like to proceed?
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const existing = duplicateItemModal.existingItem;
                    setDuplicateItemModal({ open: false, item: null, existingItem: null });
                    if (existing && existing.batches && existing.batches.length > 0) {
                      reopenBatchModal(existing);
                    } else {
                      toast.info('Update quantity directly in the cart.');
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition text-sm"
                >
                  Modify Existing Row
                </button>
                <button
                  type="button"
                  onClick={() => proceedAddItemAsNew(duplicateItemModal.item)}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg border border-gray-300 transition text-sm"
                >
                  Add as New Row Below (Duplicate)
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateItemModal({ open: false, item: null, existingItem: null })}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition mt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Select Modal */}
        {batchModal.open && (
          <BatchSelectModal
            item={batchModal.item}
            batches={batchModal.batches}
            existingSelections={batchModal.existingSelections}
            onClose={() => setBatchModal({ open: false, item: null, batches: [], cartIdx: null, existingSelections: null })}
            onSelect={(batchSelections) => handleBatchSelection(batchModal.cartIdx, batchModal.item, batchSelections)}
          />
        )}
      </div>
    // </PinProtected>
  );
};

export default SaleEdit;