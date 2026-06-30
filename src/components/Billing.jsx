import { Download, Printer, RefreshCw, Plus, Save, Search, ShoppingCart, Trash2, User, SendHorizontal, Calendar, X } from 'lucide-react';
import { useHotkeys } from "react-hotkeys-hook";
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import BillPDF from './BillPDF';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import CustomerFormModal from './admin/modals/CustomerFormModal';
import BatchSelectModal from './BatchSelectModal';

const Billing = () => { 
  // Load saved state from sessionStorage or use defaults
  const loadSavedState = () => {
    const saved = sessionStorage.getItem('billingState');
    if (saved) {
      try {
        return JSON.parse(saved); 
      } catch (e) {
        console.error('Error loading saved state:', e);
        return null;
      }
    }
    return null;
  };

  const savedState = loadSavedState();

  const [items, setItems] = useState([]);
  const [cart, setCart] = useState(savedState?.cart || []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [discount, setDiscount] = useState(savedState?.discount || 0);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(savedState?.billDate || new Date().toISOString().split('T')[0]);
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(savedState?.selectedSalesman || '');
  const [billNarration, setBillNarration] = useState(savedState?.billNarration || '');
  const [customers, setCustomers] = useState([]);
  const [customerDropdown, setCustomerDropdown] = useState(false);
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);
  const [gstOnSale, setGstOnSale] = useState(false);

  const [shippedDropdown, setShippedDropdown] = useState(false);
  const [shippedDropdownIndex, setShippedDropdownIndex] = useState(0);

  const [isSalesmanCustomer, setIsSalesmanCustomer] = useState(savedState?.isSalesmanCustomer || false);
  const [isOthers, setIsOthers] = useState(savedState?.isOthers || false);

  // Add new state
  const [isShippedDifferent, setIsShippedDifferent] = useState(savedState?.isShippedDifferent || false);
  const [shippedToInfo, setShippedToInfo] = useState(savedState?.shippedToInfo || {
    name: '',
    contact: '',
    address: '',
    gstin: ''
  });

  // Refs
  const discountInputRef = useRef();
  const qtyInputRefs = useRef({});
  const searchInputRef = useRef();
  const customerNameInputRef = useRef();
  const customerContactInputRef = useRef();

  // Customer info
  const [customerInfo, setCustomerInfo] = useState(savedState?.customerInfo || {
    name: '',
    contact: '',
    address: '',
    gstin: ''
  });

  // Hotkeys
  useHotkeys('ctrl+k', (e) => { e.preventDefault(); searchInputRef.current?.focus(); }, { enableOnTags: ['INPUT'] });
  useHotkeys('ctrl+f', (e) => { e.preventDefault(); discountInputRef.current?.focus(); }, { enableOnTags: ['INPUT'] });
  useHotkeys('ctrl+c', () => completeSale('complete'));

  // Customer modal state
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    contact: '',
    address: '',
    email: '',
    gstin: '',
    state: '',
    city: '',
    country: 'India',
    pincode: '',
    credit_limit: '',
    credit_days: ''
  });
  const [customerErrors, setCustomerErrors] = useState({});

  // Batch modal state
  const [batchModal, setBatchModal] = useState({ open: false, item: null, batches: [], cartIdx: null, existingSelections: null });
  const [selectedBatches, setSelectedBatches] = useState({}); // { [itemId]: [{batch, qty}] }

  const [previewCompanyInfo, setPreviewCompanyInfo] = useState(null);
  const [previewLogoDataUrl, setPreviewLogoDataUrl] = useState(null);
  const [previewQrCodeDataUrl, setPreviewQrCodeDataUrl] = useState(null);

  useEffect(() => {
    loadItems();
    generateBillNumber();
    fetchSalesmen();
    fetchCustomers();
    loadTaxSettings();
    if (import.meta.env.DEV) {
      loadPreviewCompanyInfo();
    }
  }, []);

  const loadPreviewCompanyInfo = async () => {
    try {
      const companyResult = await window.electronAPI.getCompanyInfo();
      if (companyResult.success && companyResult.data) {
        setPreviewCompanyInfo(companyResult.data);
        if (companyResult.data.logo_path) {
          const logoResult = await window.electronAPI.getLogoAsBase64(companyResult.data.logo_path);
          if (logoResult.success) {
            setPreviewLogoDataUrl(logoResult.dataUrl);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV && previewCompanyInfo?.upi_id && previewCompanyInfo.upi_id.trim() !== '') {
      const upiString = `upi://pay?pa=${previewCompanyInfo.upi_id}&pn=${encodeURIComponent(previewCompanyInfo.company_name)}&am=${getFinalTotal()}&cu=INR`;
      QRCode.toDataURL(upiString, { width: 256, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
        .then(url => setPreviewQrCodeDataUrl(url))
        .catch(console.error);
    }
  }, [cart, discount, gstOnSale, previewCompanyInfo]);

  const loadTaxSettings = async () => {
    try {
      const rows = await window.electronAPI.getSettings();
      const saleSetting = (rows || []).find((s) => s.key === 'gst_on_sale');
      setGstOnSale(String(saleSetting?.value || '0') === '1');
    } catch (error) {
      console.error('Error loading tax settings:', error);
    }
  };

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      cart,
      discount,
      billDate,
      selectedSalesman,
      billNarration,
      customerInfo,
      shippedToInfo,
      isShippedDifferent,
      isSalesmanCustomer,
      isOthers
    };
    sessionStorage.setItem('billingState', JSON.stringify(stateToSave));
  }, [cart, discount, billDate, selectedSalesman, billNarration, customerInfo, shippedToInfo, isShippedDifferent, isSalesmanCustomer, isOthers]);

  const loadItems = async () => { 
    try {
      const data = await window.electronAPI.getInventory();
      console.log('Inventory data loaded:', data);
      setItems(data);

      // Update cart items with latest stock info if cart was loaded from session
      if (savedState?.cart && savedState.cart.length > 0) {
        const updatedCart = savedState.cart.map(cartItem => {
          const freshItem = data.find(item => item.id === cartItem.id);
          if (freshItem) {
            return {
              ...cartItem,
              current_stock: freshItem.current_stock,
              unit_price: cartItem.unit_price // Keep the original price from saved state
            };
          }
          return cartItem;
        });
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBillNumber = async () => {
    try {
      const number = await window.electronAPI.generateBillNumber();
      setBillNumber(number);
    } catch (error) {
      console.error('Error generating bill number:', error);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const list = await window.electronAPI.getSalesmen();
      setSalesmen(list);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const list = await window.electronAPI.getCustomers();
      setCustomers(list || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  const filteredShippedCustomers = customers.filter(c =>
    (shippedToInfo.name && c.name?.toLowerCase().includes(shippedToInfo.name.toLowerCase())) ||
    (shippedToInfo.contact && c.contact?.includes(shippedToInfo.contact))
  );
  const handleShippedSelect = (customer) => {
    setShippedToInfo({
      name: customer.name || '',
      contact: customer.contact || '',
      address: customer.address || '',
      gstin: customer.gstin || ''
    });
    setShippedDropdown(false);
  };

  const handleShippedInputKeyDown = (e, field) => {
    if (e.key === 'Delete') {
      setShippedToInfo({ name: '', contact: '', address: '', gstin: '' });
      setShippedDropdown(false);
      setShippedDropdownIndex(0);
      return;
    }
    if (filteredShippedCustomers.length === 0) return;
    if (e.key === 'ArrowDown') {
      setShippedDropdownIndex(i => (i + 1) % filteredShippedCustomers.length);
    } else if (e.key === 'ArrowUp') {
      setShippedDropdownIndex(i => (i - 1 + filteredShippedCustomers.length) % filteredShippedCustomers.length);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      handleShippedSelect(filteredShippedCustomers[shippedDropdownIndex]);
      setShippedDropdown(false);
      setShippedDropdownIndex(0);
    }
  };

  // Clear all form data
  const clearForm = () => {
    setCart([]);
    setDiscount(0);
    setBillDate(new Date().toISOString().split('T')[0]);
    setCustomerInfo({ name: '', contact: '', address: '', gstin: '' });
    setShippedToInfo({ name: '', contact: '', address: '', gstin: '' });
    setIsShippedDifferent(false);
    setBillNarration('');
    setSelectedSalesman('');
    setIsSalesmanCustomer(false);
    setIsOthers(false);
    setSelectedBatches({});
    sessionStorage.removeItem('billingState');
    return true;
  };

  // --- Fast item search and add ---
  const filteredItems = items.filter(item =>
  (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleSearchKeyDown = (e) => {
    if (filteredItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      setSearchIndex(i => (i + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      setSearchIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addToCart(filteredItems[searchIndex]);
      setSearchTerm('');
      setSearchDropdown(false);
      setSearchIndex(0);
    }
  };

  // --- Add to cart with proper rate selection ---
  const fetchItemBatches = async (itemId) => {
    return await window.electronAPI.getItemBatches(itemId);
  };

  const addToCart = async (item) => {
    // Check if item already exists in cart
    const existingCartItem = cart.find(c => c.id === item.id);
    if (existingCartItem) {
      // Reopen batch modal if item already in cart and has batches
      if (existingCartItem.batches && existingCartItem.batches.length > 0) {
        reopenBatchModal(existingCartItem);
      } else {
        // If no batches, just let user edit quantity directly
        toast.info('Item already in cart. Update quantity in the cart.');
      }
      return;
    }

    const batches = await fetchItemBatches(item.id);
    // Always open batch modal if batches exist OR if there's stock to manage
    // This allows selecting from general stock even if no batch tracking exists
    if (batches && batches.length > 0) {
      setBatchModal({ open: true, item, batches, cartIdx: cart.length, existingSelections: null });
    } else if (item.current_stock > 0) {
      // No batches but has stock - still open modal to select general stock
      setBatchModal({ open: true, item, batches: [], cartIdx: cart.length, existingSelections: null });
    } else {
      // No stock at all
      toast.error('Item is out of stock');
    }
  };

  // Handle batch selection and add to cart or update existing cart item
  const handleBatchSelection = (cartIdx, item, batchSelections) => {
    setBatchModal({ open: false, item: null, batches: [], cartIdx: null, existingSelections: null });

    // Calculate total qty and use weighted average MRP
    const totalQty = batchSelections.reduce((sum, b) => sum + Number(b.qty), 0);

    // Calculate weighted average MRP
    const avgMRP = totalQty > 0
      ? batchSelections.reduce((sum, b) => {
          const mrp = b.batch ? Number(b.batch.mrp) : Number(item.mrp);
          return sum + mrp * Number(b.qty);
        }, 0) / totalQty
      : item.mrp;

    const cartItem = {
      id: item.id,
      name: item.name,
      sku: item.sku,
      hsn_code: item.hsn_code,
      unit_price: avgMRP,
      quantity: totalQty,
      current_stock: item.current_stock,
      gst_percentage: item.gst_percentage,
      unit: item.unit,
      batches: batchSelections.map(b => ({
        batch_id: b.batch ? b.batch.id : null,
        batch_number: b.batch ? b.batch.batch_number : 'No Batch',
        qty: b.qty,
        mfg_date: b.batch ? b.batch.mfg_date : null,
        exp_date: b.batch ? b.batch.exp_date : null,
        purchase_rate: b.batch ? b.batch.purchase_rate : item.purchase_rate,
        mrp: b.batch ? b.batch.mrp : item.mrp
      }))
    };


    console.log('cartt is ' , cartItem)
    // Check if we're updating an existing cart item
    const existingCartItem = cart.find(c => c.id === item.id);
    if (existingCartItem) {
      // Update existing item
      setCart(prevCart => prevCart.map(c => c.id === item.id ? cartItem : c));
    } else {
      // Add new item
      setCart(prevCart => [...prevCart, cartItem]);
    }

    // Store batch selections for reopening
    setSelectedBatches(prev => ({ ...prev, [item.id]: batchSelections }));
  };

  // Reopen batch modal to edit selections
  const reopenBatchModal = async (cartItem) => {
    const batches = await fetchItemBatches(cartItem.id);
    if (batches && batches.length > 0) {
      // Convert cart item batches back to selection format
      const existingSelections = cartItem.batches?.map(b => ({
        batch_id: b.batch_id,
        qty: b.qty
      })) || [];

      setBatchModal({
        open: true,
        item: cartItem,
        batches,
        cartIdx: null,
        existingSelections
      });
    }
  };

  // --- Cart keyboard controls ---
  const handleCartKeyDown = (e, idx, itemId) => {
    if (e.key === 'Delete') {
      removeFromCart(itemId);
    } else if (e.key === '+' || e.key === '=') {
      updateCartItemQuantity(itemId, (parseInt(cart[idx].quantity) || 0) + 1);
    } else if (e.key === '-' || e.key === '_') {
      updateCartItemQuantity(itemId, (parseInt(cart[idx].quantity) || 0) - 1);
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      discountInputRef.current?.focus();
    }
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      completeSale('complete');
    }
  };

  const updateCartItemQuantity = (itemId, newQuantity) => {
    // Check for invalid quantities (null, undefined, empty string, 0, negative)
    if (!newQuantity || newQuantity <= 0 || isNaN(newQuantity)) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
    // Also clean up batch selections
    setSelectedBatches(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  // --- Totals ---
  const calculateItemTotal = (item) => {
    const baseAmount = item.unit_price * item.quantity;
    const gstRate = gstOnSale ? (item.gst_percentage || 0) : 0;
    const gstAmount = (baseAmount * gstRate) / 100;
    return { baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + calculateItemTotal(item).baseAmount, 0);

  const getDiscountedSubtotal = () => {
    const total = getSubtotal();
    const discountAmount = (total * discount) / 100;
    return total - discountAmount;
  };

  const getGstTotal = () => {
    if (!gstOnSale) return 0;
    const discountFactor = 1 - (discount || 0) / 100;
    return cart.reduce((sum, item) => {
      const baseAmount = (item.unit_price || 0) * (parseInt(item.quantity, 10) || 0);
      const discountedBase = baseAmount * discountFactor;
      const gstRate = item.gst_percentage || 0;
      return sum + (discountedBase * gstRate) / 100;
    }, 0);
  };

  const getCgstTotal = () => getGstTotal() / 2;
  const getSgstTotal = () => getGstTotal() / 2;

  const getRoundingOff = () => {
    const net = getDiscountedSubtotal() + getGstTotal();
    return +(Math.round(net) - net).toFixed(2);
  };

  const getFinalTotal = () => {
    const net = getDiscountedSubtotal() + getGstTotal();
    return Math.round(net);
  };

  // --- Sale completion ---
  const completeSale = async (action = 'complete') => {
    const filteredCart = cart.filter(item => parseInt(item.quantity) > 0);
    if (filteredCart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Stock validation
    for (const cartItem of filteredCart) {
      if (parseInt(cartItem.quantity) > cartItem.current_stock) {
        toast.error(`Insufficient stock for ${cartItem.name}. Available: ${cartItem.current_stock}`);
        return;
      }
    }
    if (!customerInfo.id) {
      toast.error('Please select a customer from the dropdown.');
      return;
    }
    try {
      // Create customer if needed
      if (customerInfo.contact && /^\d{10}$/.test(customerInfo.contact.trim())) {
        await window.electronAPI.createCustomerIfNeeded({
          name: customerInfo.name,
          contact: customerInfo.contact,
          address: customerInfo.address,
          gstin: customerInfo.gstin
        });
      }

      const discountFactor = 1 - (discount || 0) / 100;
      const saleItems = filteredCart.map(item => {
        const quantity = parseInt(item.quantity, 10) || 0;
        const baseAmount = (item.unit_price || 0) * quantity;
        const discountedBase = baseAmount * discountFactor;
        const gstRate = gstOnSale ? (item.gst_percentage || 0) : 0;
        const cgstAmount = (discountedBase * gstRate) / 200;
        const sgstAmount = (discountedBase * gstRate) / 200;
        const totalAmount = discountedBase + cgstAmount + sgstAmount;
        return {
          id: item.id,
          quantity,
          unit_price: item.unit_price,
          gst_percentage: gstRate,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          total_price: totalAmount,
          batches: item.batches || [] // <-- include batches here
        };
      });

      const saleData = {
        bill_number: billNumber,
        customer_name: customerInfo.name || null,
        customer_contact: customerInfo.contact || null,
        customer_address: customerInfo.address || null,
        customer_gstin: customerInfo.gstin || null,
        shipped_to_name: isShippedDifferent ? shippedToInfo.name : null,
        shipped_to_contact: isShippedDifferent ? shippedToInfo.contact : null,
        shipped_to_address: isShippedDifferent ? shippedToInfo.address : null,
        shipped_to_gstin: isShippedDifferent ? shippedToInfo.gstin : null,
        is_shipped_different: isShippedDifferent,
        sale_date: billDate,
        items: saleItems,
        discount,
        total_amount: getFinalTotal(),
        cgst_total: gstOnSale ? getCgstTotal() : 0,
        sgst_total: gstOnSale ? getSgstTotal() : 0,
        rounding_off: getRoundingOff(),
        salesman_id: selectedSalesman || null,
        sale_type: isOthers ? 'others' : (isSalesmanCustomer ? 'salesman' : 'customer'),
        narration: billNarration
      };

      await window.electronAPI.saveSale(saleData);

      // --- PDF/PRINT GENERATION ---
      if (action === 'pdf' || action === 'print') {
        try {
          // Load company info and logo
          const companyResult = await window.electronAPI.getCompanyInfo();
          const companyInfo = companyResult.success ? companyResult.data : null;

          let logoDataUrl = null;
          if (companyInfo?.logo_path) {
            const logoResult = await window.electronAPI.getLogoAsBase64(companyInfo.logo_path);
            if (logoResult.success) {
              logoDataUrl = logoResult.dataUrl;
            }
          }

          // Generate QR code for UPI payment if UPI ID exists
          let qrCodeDataUrl = null;
          if (companyInfo?.upi_id && companyInfo.upi_id.trim() !== '') {
            const upiString = `upi://pay?pa=${companyInfo.upi_id}&pn=${encodeURIComponent(companyInfo.company_name)}&am=${getFinalTotal()}&cu=INR`;
            qrCodeDataUrl = await QRCode.toDataURL(upiString, {
              width: 256,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          }

          // Generate PDF using @react-pdf/renderer
          const pdfDoc = pdf(
            <BillPDF
              billNumber={billNumber}
              customer={customerInfo}
              items={cart.map(item => ({
                hsn_code: item.hsn_code,
                sku: item.sku,
                name: item.name,
                quantity: parseInt(item.quantity) || 0,
                unit_price: item.unit_price
              }))}
              discount={discount}
              subtotal={getSubtotal()}
              roundingOff={getRoundingOff()}
              total={getFinalTotal()}
              sale_type={isOthers ? 'others' : (isSalesmanCustomer ? 'salesman' : 'customer')}
              salesman_name={salesmen.find(s => String(s.id) === String(selectedSalesman))?.name || ""}
              salesman_contact={salesmen.find(s => String(s.id) === String(selectedSalesman))?.contact_info || ""}
              salesman_address={salesmen.find(s => String(s.id) === String(selectedSalesman))?.address || ""}
              note={billNarration}
              isShippedDifferent={isShippedDifferent}
              shippedTo={shippedToInfo}
              companyInfo={companyInfo}
              logoDataUrl={logoDataUrl}
              qrCodeDataUrl={qrCodeDataUrl}
              billDate={billDate}
            />
          );

          if (action === 'print') {
            // Convert to array buffer for printing
            const blob = await pdfDoc.toBlob();
            const arrayBuffer = await blob.arrayBuffer();
            const result = await window.electronAPI.printPdf(arrayBuffer);

            if (result.success) {
              toast.success('Invoice sent to printer!');
            } else {
              toast.error('Failed to print: ' + result.error);
            }
          } else {
            // Download PDF
            const blob = await pdfDoc.toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice_${billNumber}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('PDF generated and downloaded!');
          }
        } catch (err) {
          console.error('PDF/Print error:', err);
          toast.error('Error generating PDF/Print: ' + err.message);
        }
      }

      await generateBillNumber();
      await loadItems();
      await fetchCustomers();

      // Reset form and clear session storage - SINGLE CALL TO clearForm()
      clearForm();




      toast.success('Sale completed successfully!');


      // Reload data

    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Error completing sale');
    }
  };

  // --- Customer dropdown handling ---
  const filteredCustomers = customers.filter(c =>
    (customerInfo.name && c.name?.toLowerCase().includes(customerInfo.name.toLowerCase())) ||
    (customerInfo.contact && c.contact?.includes(customerInfo.contact))
  );

  const handleCustomerSelect = (customer) => {
    setCustomerInfo({
      name: customer.name || '',
      contact: customer.contact || '',
      address: customer.address || '',
      gstin: customer.gstin || ''
    });
    setCustomerDropdown(false);
  };

  const handleCustomerInputKeyDown = (e, field) => {
    if (e.key === 'Delete') {
      setCustomerInfo({ name: '', contact: '', address: '', gstin: '' });
      setCustomerDropdown(false);
      setCustomerDropdownIndex(0);
      return;
    }
    if (filteredCustomers.length === 0) return;
    if (e.key === 'ArrowDown') {
      setCustomerDropdownIndex(i => (i + 1) % filteredCustomers.length);
    } else if (e.key === 'ArrowUp') {
      setCustomerDropdownIndex(i => (i - 1 + filteredCustomers.length) % filteredCustomers.length);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      handleCustomerSelect(filteredCustomers[customerDropdownIndex]);
      setCustomerDropdown(false);
      setCustomerDropdownIndex(0);
      if (field === 'name') customerContactInputRef.current?.focus();
      else if (field === 'contact') customerNameInputRef.current?.focus();
    }
  };

  // Validation function
  const validateCustomerForm = (form) => {
    const errors = {};
    if (!form.name || form.name.trim().length < 2) errors.name = 'Name is required';
    if (!form.contact || form.contact.trim().length < 5) errors.contact = 'Contact is required';
    return errors;
  };

  // Handler to add customer
  const handleAddCustomer = async () => {
    const errors = validateCustomerForm(customerForm);
    if (Object.keys(errors).length) {
      setCustomerErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const newCustomer = await window.electronAPI.addCustomer(customerForm);
      toast.success('Customer added');
      setCustomers((prev) => [...prev, newCustomer]);
      setShowCustomerForm(false);
      setCustomerForm({
        name: '',
        contact: '',
        address: '',
        email: '',
        gstin: '',
        state: '',
        city: '',
        country: 'India',
        pincode: '',
        credit_limit: '',
        credit_days: ''
      });
      setCustomerErrors({});
    } catch (error) {
      toast.error('Error adding customer');
      console.error('Error adding customer:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end">

        <div className="mt-4 sm:mt-0 flex items-center gap-3 flex-wrap">
          <div className='w-20'>
            <select
              value={selectedSalesman}
              onChange={e => setSelectedSalesman(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isOthers}
            >
              {/* <option value="">Select Salesman</option> */}

              <option value='cash'>Cash</option>
              <option value='credit'>Credit</option>

            </select>
          </div>
          <div className='w-60'>
            <select
              value={selectedSalesman}
              onChange={e => setSelectedSalesman(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isOthers}
            >
              <option value="">Select Salesman</option>
              {salesmen.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {/* Bill Date Selection */}


          <div className="flex-1 ">

            {/* <label className="block text-sm font-medium text-gray-700 mb-2">Bill Date</label> */}
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>


          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-blue-800">Bill No: {billNumber}</span>
          </div>
          <button
            onClick={clearForm}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Clear all billing information"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Form
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-1 space-y-6">


          {/* Search */}
          <div className="relative flex-1 w-full mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items (Ctrl+K to focus, Enter/Tab to add)"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setSearchDropdown(true);
                setSearchIndex(0);
              }}
              onFocus={() => setSearchDropdown(true)}
              onBlur={() => setTimeout(() => setSearchDropdown(false), 100)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              tabIndex={0}
              autoComplete="off"
            />
            {searchDropdown && filteredItems.length > 0 && (
              <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                {filteredItems.map((item, idx) => (
                  <li
                    key={item.id}
                    className={`px-3 py-2 cursor-pointer ${idx === searchIndex ? 'bg-blue-100' : ''}`}
                    onMouseDown={() => {
                      addToCart(item);
                      setSearchTerm('');
                      setSearchDropdown(false);
                      setSearchIndex(0);
                    }}
                    tabIndex={-1}
                  >
                    {item.name}
                    <span className="text-xs text-gray-400 ml-2">
                      (Stock: {item.current_stock}, Rate: ₹{item.mrp})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* <div className='flex justify-between gap-2 mb-8 '> */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Information
            </h2>

            <div className='w-full flex items-center gap-2'>
              <select
                value={customerInfo.id || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  const selectedCustomer = customers.find(c => String(c.id) === String(selectedId));
                  if (selectedCustomer) {
                    setCustomerInfo({
                      id: selectedCustomer.id,
                      name: selectedCustomer.name || '',
                      contact: selectedCustomer.contact || '',
                      address: selectedCustomer.address || '',
                      gstin: selectedCustomer.gstin || ''
                    });
                  } else {
                    setCustomerInfo({
                      id: '',
                      name: '',
                      contact: '',
                      address: '',
                      gstin: ''
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.contact})</option>
                ))}
              </select>
              <button
                onClick={() => setShowCustomerForm(true)}
                className="ml-2 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Add New Customer"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShippedDifferent}
                  onChange={(e) => {
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
            {/* </div> */}



          </div>
          {/* Shipped To Section - Only show if checkbox is checked */}
          {isShippedDifferent && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Shipped To
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={shippedToInfo.name}
                    onChange={e => {
                      setShippedToInfo({ ...shippedToInfo, name: e.target.value });
                      setShippedDropdown(true);
                      setShippedDropdownIndex(0);
                    }}
                    onFocus={() => setShippedDropdown(true)}
                    onBlur={() => setTimeout(() => setShippedDropdown(false), 100)}
                    onKeyDown={e => handleShippedInputKeyDown(e, 'name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Recipient name"
                    autoComplete="off"
                  />
                  {shippedDropdown && filteredShippedCustomers.length > 0 && (
                    <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                      {filteredShippedCustomers.map((customer, idx) => (
                        <li
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer ${idx === shippedDropdownIndex ? 'bg-blue-100' : ''}`}
                          onMouseDown={() => handleShippedSelect(customer)}
                          tabIndex={-1}
                        >
                          {customer.name} <span className="text-xs text-gray-400">({customer.contact})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Contact */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                  <input
                    type="number"
                    value={shippedToInfo.contact}
                    onWheel={e => e.target.blur()}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setShippedToInfo({ ...shippedToInfo, contact: val });
                      setShippedDropdown(true);
                      setShippedDropdownIndex(0);
                    }}
                    onFocus={() => setShippedDropdown(true)}
                    onBlur={() => setTimeout(() => setShippedDropdown(false), 100)}
                    onKeyDown={e => handleShippedInputKeyDown(e, 'contact')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone number"
                    autoComplete="off"
                  />
                  {shippedDropdown && filteredShippedCustomers.length > 0 && (
                    <ul className="absolute z-50 bg-white border border-gray-200 rounded shadow max-h-40 overflow-y-auto w-full mt-1">
                      {filteredShippedCustomers.map((customer, idx) => (
                        <li
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer ${idx === shippedDropdownIndex ? 'bg-blue-100' : ''}`}
                          onMouseDown={() => handleShippedSelect(customer)}
                          tabIndex={-1}
                        >
                          {customer.contact} <span className="text-xs text-gray-400">({customer.name})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={shippedToInfo.address}
                    onChange={e => setShippedToInfo({ ...shippedToInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Shipping address"
                  />
                </div>

                {/* GSTIN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={shippedToInfo.gstin}
                    onChange={e => setShippedToInfo({ ...shippedToInfo, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="GST number"
                  />
                </div>


              </div>
            </div>
          )}

          {/* Salesman Selection */}
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Salesman
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salesman</label>
              
            </div>
          </div> */}

          {/* Bill Narration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill Narration</h2>
            <textarea
              value={billNarration}
              onChange={e => setBillNarration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes for this bill..."
            />
          </div>
        </div>

        {/* Cart */}
        <div className=" col-span-1  lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shopping Cart</h2>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, idx) => {
                  const { totalAmount } = calculateItemTotal({ ...item, quantity: parseInt(item.quantity) || 0 });
                  return (
                    <div key={item.id} className="border-b border-gray-200 pb-2 flex justify-between items-center gap-2">
                      {/* Product Name */}
                      <span className="font-medium text-gray-900  w-5/12 truncate">{item.name}</span>
                      {/* Quantity Input */}
                      <div className="flex items-center gap-1 w-24">
                        <label className="text-xs text-gray-700">Qty</label>
                        {item.batches && item.batches.length > 0 ? (
                          // Read-only with click to edit batches
                          <div
                            onClick={() => reopenBatchModal(item)}
                            className="w-12 px-1 py-1 border border-blue-300 bg-blue-50 rounded text-sm text-center cursor-pointer hover:bg-blue-100 transition-colors font-medium text-blue-700"
                            title="Click to edit batch selection"
                          >
                            {item.quantity}
                          </div>
                        ) : (
                          // Editable input for non-batched items
                          <input
                            ref={el => qtyInputRefs.current[item.id] = el}
                            type="number"
                            onWheel={e => e.target.blur()}
                            value={item.quantity}
                            min={1}
                            max={item.current_stock}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || val === null || val === undefined) {
                                removeFromCart(item.id);
                                return;
                              }
                              const numVal = parseInt(val);
                              if (isNaN(numVal) || numVal <= 0) {
                                removeFromCart(item.id);
                              } else {
                                updateCartItemQuantity(item.id, numVal);
                              }
                            }}
                            onKeyDown={e => handleCartKeyDown(e, idx, item.id)}
                            className="w-12 px-1 py-1 border border-gray-300 rounded text-sm"
                            tabIndex={0}
                            autoFocus={item.quantity === ''}
                          />
                        )}
                        <span className="text-xs text-gray-500">/ {item.current_stock}</span>
                      </div>
                      {/* Unit Price Input */}
                      <div className="flex items-center gap-1 w-24">
                        <label className="text-xs text-gray-700">Rate</label>
                        <input
                          type="number"
                          step="0.01"
                          onWheel={e => e.target.blur()}
                          value={item.unit_price}
                          onChange={e => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            setCart(cart.map(cartItem =>
                              cartItem.id === item.id
                                ? { ...cartItem, unit_price: newPrice }
                                : cartItem
                            ));
                          }}
                          className="w-14 px-1 py-1 border border-gray-300 rounded text-sm"
                          placeholder="₹0.00"
                        />
                      </div>
                      {/* Total */}
                      <span className="font-medium text-gray-900 w-20 text-right">₹{totalAmount.toFixed(2)}</span>
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-800 ml-2"
                        tabIndex={0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Discount */}
                <div className="pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (%)
                  </label>
                  <input
                    ref={discountInputRef}
                    type="number"
                    onWheel={e => e.target.blur()}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    tabIndex={0}
                  />
                </div>

                {/* Totals */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{getSubtotal().toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}%):</span>
                      <span>-₹{(getSubtotal() * discount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {gstOnSale && (
                    <div className="flex justify-between">
                      <span>Total GST:</span>
                      <span>₹{getGstTotal().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Rounding Off:</span>
                    <span>₹{getRoundingOff() >= 0 ? '+' : ''}{getRoundingOff().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span>₹{getFinalTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => completeSale('complete')}
                    className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    tabIndex={0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Complete Sale (Ctrl+C)
                  </button>
                  <button
                    onClick={() => completeSale('print')}
                    className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    tabIndex={0}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Complete & Print
                  </button>
                  <button
                    onClick={() => completeSale('pdf')}
                    className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    tabIndex={0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Complete & Generate PDF
                  </button>
                  {/* <button
                    onClick={() => toast.info('Coming Soon')}
                    className="flex-1 min-w-[150px] flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    tabIndex={0}
                  >
                    <SendHorizontal className="w-4 h-4 mr-2" />
                    WhatsApp Invoice
                  </button> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dev Mode PDF Preview */}
      {import.meta.env.DEV && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Live PDF Preview (Dev Mode)</h2>
          <div className="w-full h-[800px] border border-gray-300 rounded-lg overflow-hidden">
            <PDFViewer width="100%" height="100%">
              <BillPDF
                billNumber={billNumber}
                customer={customerInfo}
                items={cart.map(item => ({
                  hsn_code: item.hsn_code,
                  sku: item.sku,
                  name: item.name,
                  quantity: parseInt(item.quantity) || 0,
                  unit_price: item.unit_price
                }))}
                discount={discount}
                subtotal={getSubtotal()}
                roundingOff={getRoundingOff()}
                total={getFinalTotal()}
                sale_type={isOthers ? 'others' : (isSalesmanCustomer ? 'salesman' : 'customer')}
                salesman_name={salesmen.find(s => String(s.id) === String(selectedSalesman))?.name || ""}
                salesman_contact={salesmen.find(s => String(s.id) === String(selectedSalesman))?.contact_info || ""}
                salesman_address={salesmen.find(s => String(s.id) === String(selectedSalesman))?.address || ""}
                note={billNarration}
                isShippedDifferent={isShippedDifferent}
                shippedTo={shippedToInfo}
                companyInfo={previewCompanyInfo}
                logoDataUrl={previewLogoDataUrl}
                qrCodeDataUrl={previewQrCodeDataUrl}
                billDate={billDate}
              />
            </PDFViewer>
          </div>
        </div>
      )}

      {/* Customer Add Modal */}
      <CustomerFormModal
        isOpen={showCustomerForm}
        isEditing={false}
        customerForm={customerForm}
        customerErrors={customerErrors}
        setCustomerForm={setCustomerForm}
        setCustomerErrors={setCustomerErrors}
        onSubmit={handleAddCustomer}
        onClose={() => {
          setShowCustomerForm(false);
          setCustomerForm({
            name: '',
            contact: '',
            address: '',
            email: '',
            gstin: '',
            state: '',
            city: '',
            country: 'India',
            pincode: '',
            credit_limit: '',
            credit_days: ''
          });
          setCustomerErrors({});
        }}
      />

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
  );
};

export default Billing;

// --- BatchSelectModal Component ---
// Create this file: src/components/BatchSelectModal.jsx