import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Save,
  History,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import PinProtected from './reusables/PinProtected';
import ReactDOM from 'react-dom'; 
import SupplierFormModal from './admin/modals/SupplierFormModal';
import ProductFormModal from './admin/modals/ProductFormModal';

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

const initialPurchaseForm = {
  supplier_id: '',
  invoice_number: '',
  purchase_date: new Date().toISOString().split('T')[0],
  discount: 0,
  items: []
};

const initialSupplierForm = {
  name: '',
  contact: '',
  email: '',
  gstin: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  credit_days: ''
};

const calculateItemSummary = (item, catalogItems, applyGst) => {
  const selectedItem = catalogItems.find(i => i.id == item.id);
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const discountRate = Number(item.discount) || 0;
  const baseAmount = quantity * unitPrice;
  const discountAmount = discountRate ? (baseAmount * discountRate) / 100 : 0;
  const discountedAmount = baseAmount - discountAmount;
  const gstRate = applyGst ? (selectedItem?.gst_percentage || 0) : 0;
  const cgstAmount = (discountedAmount * gstRate) / 200;
  const sgstAmount = (discountedAmount * gstRate) / 200;
  const totalWithGst = discountedAmount + cgstAmount + sgstAmount;

  return {
    selectedItem,
    baseAmount,
    discountAmount,
    discountedAmount,
    gstRate,
    cgstAmount,
    sgstAmount,
    totalWithGst,
    mrp: selectedItem?.mrp || 0
  };
};

const Purchase = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [gstOnPurchase, setGstOnPurchase] = useState(false);

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [gstRates, setGstRates] = useState([]);

  const [purchaseForm, setPurchaseForm] = useState(initialPurchaseForm);

  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [supplierErrors, setSupplierErrors] = useState({});

  const [showItemHistory, setShowItemHistory] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [supplierDropdownIndex, setSupplierDropdownIndex] = useState(0);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const supplierInputRef = useRef(null);
  const navigate = useNavigate();

  // For item dropdown search
  const [itemSearch, setItemSearch] = useState({});
  const [showItemList, setShowItemList] = useState({});
  const [itemDropdownIndex, setItemDropdownIndex] = useState({});

  // For item input refs
  const itemInputRefs = useRef({});

  const itemSummaries = useMemo(
    () => purchaseForm.items.map(item => calculateItemSummary(item, items, gstOnPurchase)),
    [purchaseForm.items, items, gstOnPurchase]
  );

  // New states and functions for product form
  const [showProductForm, setShowProductForm] = useState(false);
  const initialProductForm = {
    name: '',
    sku: '',
    hsn_code: '',
    description: '',
    unit: '',
    mrp: '',
    purchase_rate: '',
    sale_rate: '',
    gst_percentage: '',
    category_id: '',
    current_stock: '',
    minimum_stock: 10
  };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [productErrors, setProductErrors] = useState({});

  const validateSupplierForm = (form) => {
    const errors = {};
    const isEmpty = (v) => v === '' || v === null || v === undefined;

    if (isEmpty(form.name) || String(form.name).trim().length < 2) {
      errors.name = 'Name is required';
    }
    if (isEmpty(form.contact) || String(form.contact).trim().length < 5) {
      errors.contact = 'Contact is required';
    }
    if (isEmpty(form.gstin) || String(form.gstin).trim().length < 3) {
      errors.gstin = 'GSTIN is required';
    }

    return errors;
  };

  const validateProductForm = (form) => {
    const errors = {};
    const isEmpty = (v) => v === '' || v === null || v === undefined;
    if (isEmpty(form.name) || String(form.name).trim().length < 2) errors.name = 'Name is required';
    if (isEmpty(form.sku) || String(form.sku).trim().length < 1) errors.sku = 'SKU is required';
    if (isEmpty(form.unit)) errors.unit = 'Unit is required';
    if (isEmpty(form.category_id)) errors.category_id = 'Category is required';
    const mrp = parseFloat(form.mrp);
    if (isNaN(mrp) || mrp <= 0) errors.mrp = 'MRP must be greater than 0';
    const pr = parseFloat(form.purchase_rate);
    if (isNaN(pr) || pr <= 0) errors.purchase_rate = 'Purchase rate must be greater than 0';
    const sr = parseFloat(form.sale_rate);
    if (isNaN(sr) || sr <= 0) errors.sale_rate = 'Sale rate must be greater than 0';
    if (isEmpty(form.gst_percentage) && form.gst_percentage !== 0) errors.gst_percentage = 'GST rate is required';
    return errors;
  };

  const buildProductPayload = (form) => ({
    name: String(form.name).trim(),
    sku: String(form.sku).trim(),
    hsn_code: String(form.hsn_code || '').trim(),
    description: String(form.description || '').trim(),
    unit: String(form.unit),
    mrp: Math.max(0, parseFloat(form.mrp) || 0),
    purchase_rate: Math.max(0, parseFloat(form.purchase_rate) || 0),
    sale_rate: Math.max(0, parseFloat(form.sale_rate) || 0),
    gst_percentage: parseFloat(form.gst_percentage) || 0,
    category_id: parseInt(form.category_id, 10),
    current_stock: Math.max(0, parseInt(form.current_stock, 10) || 0),
    minimum_stock: Math.max(0, parseInt(form.minimum_stock, 10) || 0)
  });

  const handleAddProduct = async () => {
    const errors = validateProductForm(productForm);
    if (Object.keys(errors).length) {
      setProductErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    try {
      // Check SKU uniqueness
      const skuExists = await window.electronAPI.checkSkuExists(productForm.sku);
      if (skuExists) {
        setProductErrors({ ...errors, sku: 'SKU already exists' });
        toast.error('SKU already exists');
        return;
      }
      const payload = buildProductPayload(productForm);
      const newProduct = await window.electronAPI.addItem(payload);
      toast.success('Product added successfully');
      setItems([...items, newProduct]);
      setShowProductForm(false);
      setProductForm(initialProductForm);
      setProductErrors({});
    } catch (error) {
      toast.error('Error adding product');
      console.error('Error adding product:', error);
    }
  };

  const handleGenerateSku = async () => {
    if (!window.electronAPI?.getNextSku) return;
    try {
      const nextSku = await window.electronAPI.getNextSku();
      setProductForm(prev => ({ ...prev, sku: nextSku }));
      setProductErrors(prev => ({ ...prev, sku: undefined }));
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  };

  useEffect(() => {
    if (showProductForm) {
      handleGenerateSku();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProductForm]);

  useEffect(() => {

    loadData();
    // loadMetaData();

  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersData, itemsData, categoriesData, unitsData, gstData, appSettings] = await Promise.all([
        window.electronAPI.getSuppliers(),
        window.electronAPI.getInventory(),
        window.electronAPI.getCategories ? window.electronAPI.getCategories() : Promise.resolve([]),
        window.electronAPI.getUnits ? window.electronAPI.getUnits() : Promise.resolve([]),
        window.electronAPI.getGstRates ? window.electronAPI.getGstRates() : Promise.resolve([]),
        window.electronAPI.getSettings ? window.electronAPI.getSettings() : Promise.resolve([])
      ]);

      setSuppliers(suppliersData);
      setItems(itemsData);
      setCategories(categoriesData);
      setUnits(unitsData);
      setGstRates(gstData);
      const gstSaleSetting = (appSettings || []).find(s => s.key === 'gst_on_purchase');
      setGstOnPurchase(String(gstSaleSetting?.value || '0') === '1');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading purchase data');
    } finally {
      setLoading(false);
    }
  };

  const updateOverallDiscount = (newDiscount) => {
    setOverallDiscount(newDiscount);

    // Apply to all existing items that haven't been manually changed
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        discount: newDiscount
      }))
    }));
  };
  const addItemToPurchase = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, {
        id: '', quantity: '', unit_price: '', total_price: 0,
        discount: overallDiscount
      }]
    });
  };

  const updatePurchaseItem = (index, field, value) => {
    const updatedItems = [...purchaseForm.items];
    updatedItems[index][field] = value;

    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }

    setPurchaseForm({ ...purchaseForm, items: updatedItems });
  };

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

  const addNewSupplier = async () => {
    const errors = validateSupplierForm(supplierForm);
    if (Object.keys(errors).length) {
      setSupplierErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const supplier = await window.electronAPI.addSupplier(supplierForm);
      setSuppliers([...suppliers, supplier]);
      setSupplierForm(initialSupplierForm);
      setSupplierErrors({});
      setShowNewSupplierForm(false);
      toast.success('Supplier added successfully');
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Error adding supplier');
    }
  };

  const savePurchase = async () => {

    if (isSavingPurchase) {
      return;
    }
    setIsSavingPurchase(true);


    const supplierValid = suppliers.some(s => s.id === purchaseForm.supplier_id);
    if (!supplierValid) {
      toast.error('Please select a valid supplier from the dropdown.');
      setIsSavingPurchase(false);
      return;
    }

    // Validate items selection
    const invalidItemIndex = purchaseForm.items.findIndex(item => {
      // Must have a valid item id from dropdown
      return !items.some(i => i.id == item.id);
    });
    if (invalidItemIndex !== -1) {
      toast.error(`Please select a valid item for row ${invalidItemIndex + 1} from the dropdown.`);
      setIsSavingPurchase(false);
      return;
    }

    if (!purchaseForm.supplier_id || purchaseForm.items.length === 0) {
      toast.error('Please fill all required fields');
      setIsSavingPurchase(false);
      return;
    }


    const rows = purchaseForm.items.map((item, index) => ({
      item,
      summary: itemSummaries[index]
    }));

    const validRows = rows.filter(({ summary }) =>
      summary.selectedItem && summary.baseAmount > 0
    );

    if (validRows.length === 0) {
      toast.error('Please enter at least one valid item (with name, quantity, and unit price)');
      setIsSavingPurchase(false);
      return;
    }


    const total_amount = getFinalTotal();
    const rounding_off = getRoundingOff();
    const itemsWithGST = validRows.map(({ item, summary }) => ({
      ...item,
      gst_percentage: summary.gstRate,
      cgst_amount: summary.cgstAmount,
      sgst_amount: summary.sgstAmount,
      total_price: summary.totalWithGst
    }));

    const cgst_total = itemsWithGST.reduce((sum, row) => sum + row.cgst_amount, 0);
    const sgst_total = itemsWithGST.reduce((sum, row) => sum + row.sgst_amount, 0);

    try {
      await window.electronAPI.savePurchase({
        ...purchaseForm,
        items: itemsWithGST, // each item includes .discount
        total_amount,
        cgst_total,
        sgst_total,
        rounding_off,
        discount: purchaseForm.discount
      });
console.log('Purchase saved successfully',purchaseForm);          
      // Reset form: clear all except date
      setPurchaseForm({
        ...initialPurchaseForm,
        purchase_date: purchaseForm.purchase_date // keep the same date
      });
      setSupplierSearch('');
      setItemSearch({});
      setShowSupplierList(false);
      setShowItemList({});
      loadData();
      toast.success('Purchase saved successfully!');
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast.error('Error saving purchase');
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const showPurchaseHistory = async (itemId) => {
    try {
      if (window.electronAPI) {
        const history = await window.electronAPI.getItemPurchaseHistory(itemId);
        setItemHistory(history);
        setShowItemHistory(itemId);
        console.log(history);
      }
    } catch (error) {
      toast.error('Error loading item history');
    }
  };

  // Filter suppliers based on input
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Keyboard navigation for supplier dropdown
  const handleSupplierInputKeyDown = (e) => {
    if (showSupplierList && filteredSuppliers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSupplierDropdownIndex((prev) =>
          prev < filteredSuppliers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSupplierDropdownIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuppliers.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredSuppliers[supplierDropdownIndex]) {
          handleSupplierSelect(filteredSuppliers[supplierDropdownIndex]);
          e.preventDefault();
          // Move focus to next field (invoice number)
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

  // Filter items for a row
  const getFilteredItems = (search) =>
    items.filter(i =>
      i.name.toLowerCase().includes((search || '').toLowerCase()) ||
      (i.sku && i.sku.toLowerCase().includes((search || '').toLowerCase()))
    );

  // Keyboard navigation for item dropdown
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
          // Move focus to quantity input
          document.getElementById(`qty-input-${rowIdx}`)?.focus();
        }
      } else if (e.key === 'Escape') {
        setShowItemList(list => ({ ...list, [rowIdx]: false }));
      }
    }
    // Delete row on Delete key
    if (e.key === 'Delete') {
      removePurchaseItem(rowIdx);
    }
    // Show history on Ctrl+H
    if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
      const itemId = purchaseForm.items[rowIdx]?.id;
      if (itemId) showPurchaseHistory(itemId);
    }
  };

  const handleItemSelect = (item, rowIdx) => {
    const updatedItems = [...purchaseForm.items];
    updatedItems[rowIdx].id = item.id;
    updatedItems[rowIdx].unit_price = item.purchase_rate || 0;
    updatedItems[rowIdx].mrp = item.mrp || 0; // <-- Set default MRP here
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
    setItemSearch(search => ({ ...search, [rowIdx]: item.name }));
    setShowItemList(list => ({ ...list, [rowIdx]: false }));
    setItemDropdownIndex(idx => ({ ...idx, [rowIdx]: 0 }));
  };
  // Save purchase on Ctrl+C anywhere in the form
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        savePurchase();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    // eslint-disable-next-line
  }, [purchaseForm, items]);

  const subtotal = itemSummaries.reduce((sum, summary) => sum + summary.baseAmount, 0);
  const totalDiscountAmount = itemSummaries.reduce((sum, summary) => sum + summary.discountAmount, 0);
  const subtotalAfterDiscount = subtotal - totalDiscountAmount;
  const cgstTotal = itemSummaries.reduce((sum, summary) => sum + summary.cgstAmount, 0);
  const sgstTotal = itemSummaries.reduce((sum, summary) => sum + summary.sgstAmount, 0);
  const totalWithGst = subtotalAfterDiscount + cgstTotal + sgstTotal;
  const getRoundingOff = () => +(Math.round(totalWithGst) - totalWithGst).toFixed(2);
  const getFinalTotal = () => Math.round(totalWithGst);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
     <PinProtected message="This module is protected and requires PIN verification to access." modulename='Purchase'>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
          <p className="text-gray-600">Record new purchases and manage supplier information</p>
        </div>
        {/* <button
          onClick={() => navigate('/purchase-history')}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          View Purchase History
        </button> */}
      </div>

      {/* Purchase Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Purchase</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Supplier Dropdown */}
          <div>
            <div className="flex items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Supplier</label>
              <button
                onClick={() => setShowNewSupplierForm(true)}
                className="ml-2 px-1 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                tabIndex={-1}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

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
                className="min-w-[160px] w-full md:w-[220px] px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-base"
                autoComplete="off"
                tabIndex={0}
              />
              {showSupplierList && filteredSuppliers.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                  {filteredSuppliers.map((supplier, idx) => (
                    <li
                      key={supplier.id}
                      className={`px-3 py-2 cursor-pointer ${idx === supplierDropdownIndex ? 'bg-blue-100' : ''
                        }`}
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
            <label className="block text-base font-medium text-gray-700 mb-2">Invoice Number</label>
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
            <label className="block text-base font-medium text-gray-700 mb-2">Purchase Date</label>
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
            <div className="flex items-center gap-2">
              <h3 className="text-md font-medium text-gray-900">Items</h3>
              <button
                onClick={() => setShowProductForm(true)}
                className="px-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Add New Item"
                type="button"
                tabIndex={-1}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mfg date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exp date</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th> */}

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount (%)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discounted Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total (With GST)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseForm.items.map((item, index) => {
                    const selectedItem = items.find(i => i.id == item.id);
                    const MRP = selectedItem?.mrp || 0;
                    const gstRate = gstOnPurchase ? (selectedItem?.gst_percentage || 0) : 0;
                    const baseAmount = item.quantity * item.unit_price;
                    const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
                    const discountedAmount = baseAmount - itemDiscount;
                    const gstAmount = (discountedAmount * gstRate) / 100;
                    const totalWithGst = discountedAmount + gstAmount;
                    console.log({
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      baseAmount,
                      itemDiscount,
                      discountedAmount,
                      gstRate,
                      gstAmount
                    });
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
                                // Only auto-select if not empty
                                if (value.trim() !== '') {
                                  const match = items.find(i => i.name.toLowerCase() === value.toLowerCase());
                                  if (match) {
                                    const updatedItems = [...purchaseForm.items];
                                    updatedItems[index].id = match.id;
                                    updatedItems[index].unit_price = match.purchase_rate || 0;
                                    updatedItems[index].mrp = match.mrp || 0;
                                    setPurchaseForm({ ...purchaseForm, items: updatedItems });
                                  }
                                } else {
                                  // If input is empty, clear the selected item for this row
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
                                  // Select the first filtered item on Enter/Tab
                                  handleItemSelect(filtered[itemDropdownIndex[index] || 0] || filtered[0], index);
                                  e.preventDefault();
                                  // Move focus to quantity input
                                  document.getElementById(`qty-input-${index}`)?.focus();
                                } else {
                                  handleItemInputKeyDown(e, index);
                                }
                              }}
                              placeholder="Type to search item"
                              className="w-[300px] px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-base"
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
                                    className={`px-3 py-2 cursor-pointer ${idx === (itemDropdownIndex[index] || 0) ? 'bg-blue-100' : ''
                                      }`}
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
                          {item.id && (
                            <button
                              type="button"
                              onClick={() => showPurchaseHistory(item.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Show Purchase History (Ctrl+H)"
                              tabIndex={-1}
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={e => updatePurchaseItem(index, 'batch_number', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Batch No"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={item.mfg_date || ''}
                            onChange={e => updatePurchaseItem(index, 'mfg_date', e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Mfg Date"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={item.exp_date || ''}
                            onChange={e => updatePurchaseItem(index, 'exp_date', e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Exp Date"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            id={`qty-input-${index}`}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updatePurchaseItem(index, 'quantity', parseInt(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                            min="0"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Delete') removePurchaseItem(index);
                              if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
                                if (item.id) showPurchaseHistory(item.id);
                              }
                            }}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updatePurchaseItem(index, 'unit_price', parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                            min="0"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Delete') removePurchaseItem(index);
                              if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
                                if (item.id) showPurchaseHistory(item.id);
                              }
                              if (e.key === 'Tab' && !e.shiftKey) {
                                // On Tab after unit price, add new item
                                addItemToPurchase();
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.mrp}
                            onChange={e => updatePurchaseItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                            min="0"
                            placeholder="MRP"
                          />
                        </td> 
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">{gstRate}%</span>
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
                            className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
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

        {/* Total and Save */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-4 border-t border-gray-200 gap-4">
          <button
            onClick={savePurchase}
            className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors order-2 md:order-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Purchase
          </button>
          <div className="flex flex-col items-end space-y-1 order-1 md:order-2 w-full md:w-auto">
            {/* Subtotal before discount */}
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Subtotal :</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {/* Discount amount */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">


              <span className="font-medium text-gray-700">Total Discount:</span>
              <input
                type="number"
                value={overallDiscount}
                onChange={(e) => updateOverallDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                tabIndex={0}
              />
              <span className="text-red-600 font-semibold">- ₹{totalDiscountAmount.toFixed(2)}</span>
            </div>


            {/* Overall Discount input */}
            <div className="flex justify-between w-full md:w-auto items-center">
              <label className="block text-base font-medium text-gray-700 mb-2">Overall Discount (%)</label>

            </div>
            {/* CGST */}
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Total CGST:</span>
              <span>₹{cgstTotal.toFixed(2)}</span>
            </div>
            {/* SGST */}
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Total SGST:</span>
              <span>₹{sgstTotal.toFixed(2)}</span>
            </div>
            {/* Total with GST */}
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Total With GST:</span>
              <span>₹{totalWithGst.toFixed(2)}</span>
            </div>
            {/* Rounding Off */}
            <div className="flex justify-between w-full md:w-auto">
              <span className="font-medium text-gray-700 mr-2">Rounding Off:</span>
              <span>
                {getRoundingOff() > 0 ? '+' : '-'}₹{Math.abs(getRoundingOff()).toFixed(2)}
              </span>
            </div>
            {/* Grand Total */}
            <div className="flex justify-between w-full md:w-auto text-lg font-semibold border-t border-gray-200 pt-2">
              <span>Grand Total:</span>
              <span>₹{getFinalTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>


      <SupplierFormModal
        isOpen={showNewSupplierForm}
        isEditing={false}
        supplierForm={supplierForm}
        supplierErrors={supplierErrors}
        setSupplierForm={setSupplierForm}
        setSupplierErrors={setSupplierErrors}
        onSubmit={addNewSupplier}
        onClose={() => {
          setShowNewSupplierForm(false);
          setSupplierForm(initialSupplierForm);
          setSupplierErrors({});
        }}
      />

      {/* Item History Modal */}
      {showItemHistory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowItemHistory(null)}
        >
          <div
            className="bg-white rounded-xl p-8 w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-2xl relative custom-scroll"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Purchase History</h2>
              <button
                onClick={() => setShowItemHistory(null)}
                className="text-white bg-red-600 hover:bg-red-700 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                title="Close"
              >
                <span className="text-2xl leading-none font-bold">×</span>
              </button>
            </div>
            {itemHistory.length > 0 ? (() => {
              // Find lowest and highest price records
              const sortedByPrice = [...itemHistory].sort((a, b) => a.unit_price - b.unit_price);
              const lowest = sortedByPrice[0];
              const highest = sortedByPrice[sortedByPrice.length - 1];

              // Remove lowest and highest from the rest (if same record, only show once)
              const rest = itemHistory
                .filter(
                  r =>
                    r !== lowest &&
                    r !== highest
                )
                .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

              return (
                <div className="space-y-5">
                  {/* Lowest Price */}
                  <div className="border border-green-300 rounded-lg p-5 bg-green-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <span className="font-semibold text-green-800 text-lg">Lowest Price</span>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        <div>
                          <span className="font-medium">Supplier:</span> {lowest.supplier_name}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(lowest.purchase_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {lowest.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Price:</span> <span className="text-green-700 font-bold">₹{lowest.unit_price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Highest Price (only if different from lowest) */}
                  {highest !== lowest && (
                    <div className="border border-red-300 rounded-lg p-5 bg-red-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <span className="font-semibold text-red-800 text-lg">Highest Price</span>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                          <div>
                            <span className="font-medium">Supplier:</span> {highest.supplier_name}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(highest.purchase_date).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Quantity:</span> {highest.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Price:</span> <span className="text-red-700 font-bold">₹{highest.unit_price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Rest of the history, sorted by date (recent first) */}
                  {rest.length > 0 && rest.map((record, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-5">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Supplier:</span> {record.supplier_name}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(record.purchase_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {record.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Price:</span> ₹{record.unit_price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <p className="text-gray-600 text-center py-8">No purchase history available</p>
            )}
          </div>
          {/* Custom scrollbar styles */}
          <style>
            {`
              .custom-scroll::-webkit-scrollbar {
                width: 10px;
              }
              .custom-scroll::-webkit-scrollbar-thumb {
                background: #e5e7eb;
                border-radius: 8px;
              }
              .custom-scroll::-webkit-scrollbar-thumb:hover {
                background: #cbd5e1;
              }
              .custom-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
            `}
          </style>
        </div>
      )}

      <ProductFormModal
        isOpen={showProductForm}
        isEditing={false}
        productForm={productForm}
        productErrors={productErrors}
        units={units}
        categories={categories}
        gstRates={gstRates}
        setProductForm={setProductForm}
        setProductErrors={setProductErrors}
        onGenerateSku={handleGenerateSku}
        onSubmit={handleAddProduct}
        onClose={() => {
          setShowProductForm(false);
          setProductForm(initialProductForm);
          setProductErrors({});
        }}
      />

      {/* <ToastContainer position="top-right" autoClose={3000} /> */}
    </div>

    </PinProtected>
  );
};

export default Purchase;