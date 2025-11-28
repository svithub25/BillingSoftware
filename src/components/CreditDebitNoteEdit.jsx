import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PlusCircle, Trash2, Search } from 'lucide-react';
import { toast } from 'react-toastify';

// Calculate item summary with GST
const calculateItemSummary = (item) => {
  const returnQty = Number(item.return_quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const discountRate = Number(item.discount) || 0;
  const gstRate = Number(item.gst_percentage) || 0;

  const baseAmount = returnQty * unitPrice;
  const discountAmount = discountRate ? (baseAmount * discountRate) / 100 : 0;
  const taxableAmount = baseAmount - discountAmount;
  const cgstAmount = (taxableAmount * gstRate) / 200;
  const sgstAmount = (taxableAmount * gstRate) / 200;
  const totalAmount = taxableAmount + cgstAmount + sgstAmount;

  return {
    baseAmount,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    totalAmount
  };
};

const initialForm = {
  note_number: '',
  note_type: 'credit',
  reference_type: 'sale',
  sale_id: '',
  purchase_id: '',
  original_invoice_number: '',
  original_invoice_date: '',
  party_name: '',
  party_contact: '',
  party_address: '',
  party_gstin: '',
  party_state: '',
  party_city: '',
  note_date: new Date().toISOString().substring(0, 10),
  reason: '',
  reason_code: '',
  subtotal: 0,
  discount: 0,
  cgst_total: 0,
  sgst_total: 0,
  igst_total: 0,
  other_charges: 0,
  rounding_off: 0,
  total_amount: 0,
  is_settled: 0,
  settlement_method: '',
  settlement_date: '',
  settlement_reference: '',
  is_approved: 0,
  approved_by: '',
  approved_at: '',
  remarks: '',
  status_code: 0,
  items: []
};

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const CreditDebitNoteEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [salesList, setSalesList] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [parties, setParties] = useState([]);

  // Item search states
  const [itemSearch, setItemSearch] = useState({});
  const [showItemDropdown, setShowItemDropdown] = useState({});

  // Helper for dropdown search
  const getFiltered = (list, search) =>
    list.filter(item => item.name?.toLowerCase().includes((search || '').toLowerCase()));

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadNoteData();
    }
    // eslint-disable-next-line
  }, [id]);

  const loadInitialData = async () => {
    try {
      const [salesRes, purchaseRes, itemsRes, partiesRes] = await Promise.all([
        window.electronAPI.getSalesHistory?.() || Promise.resolve([]),
        window.electronAPI.getPurchaseHistory?.() || Promise.resolve([]),
        window.electronAPI.getInventory?.() || Promise.resolve([]),
        window.electronAPI.getAllParties?.() || Promise.resolve([])
      ]);

      setSalesList(salesRes);
      setPurchaseList(purchaseRes);
      setItemsList(itemsRes);
      setParties(partiesRes);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading form data');
    }
  };

  const loadNoteData = async () => {
    setLoading(true);
    try {
      const notesData = await window.electronAPI.getCreditDebitNotes({
        type: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
      });

      const note = notesData.find(n => n.id === parseInt(id));

      if (note) {
        setFormData({
          ...note,
          items: note.items || []
        });
      } else {
        toast.error('Note not found');
        navigate('/credit-debit-note');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast.error('Error loading note data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate item summaries
  const itemSummaries = useMemo(
    () => formData.items.map(item => calculateItemSummary(item)),
    [formData.items]
  );

  // Calculate totals
  const subtotal = useMemo(() =>
    itemSummaries.reduce((sum, summary) => sum + summary.baseAmount, 0),
    [itemSummaries]
  );

  const totalDiscountAmount = useMemo(() =>
    itemSummaries.reduce((sum, summary) => sum + summary.discountAmount, 0),
    [itemSummaries]
  );

  const subtotalAfterDiscount = useMemo(() =>
    subtotal - totalDiscountAmount,
    [subtotal, totalDiscountAmount]
  );

  const cgstTotal = useMemo(() =>
    itemSummaries.reduce((sum, summary) => sum + summary.cgstAmount, 0),
    [itemSummaries]
  );

  const sgstTotal = useMemo(() =>
    itemSummaries.reduce((sum, summary) => sum + summary.sgstAmount, 0),
    [itemSummaries]
  );

  const totalWithGst = useMemo(() =>
    subtotalAfterDiscount + cgstTotal + sgstTotal + Number(formData.other_charges || 0),
    [subtotalAfterDiscount, cgstTotal, sgstTotal, formData.other_charges]
  );

  const roundingOff = useMemo(() =>
    +(Math.round(totalWithGst) - totalWithGst).toFixed(2),
    [totalWithGst]
  );

  const finalTotal = useMemo(() =>
    Math.round(totalWithGst),
    [totalWithGst]
  );

  // Auto-update totals when items change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      subtotal: subtotalAfterDiscount,
      cgst_total: cgstTotal,
      sgst_total: sgstTotal,
      rounding_off: roundingOff,
      total_amount: finalTotal
    }));
  }, [subtotalAfterDiscount, cgstTotal, sgstTotal, roundingOff, finalTotal]);

  const handleReferenceSelect = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formData.reference_type === 'sale' && value) {
      const saleDetails = await window.electronAPI.getSaleDetails(Number(value));
      if (saleDetails) {
        setFormData(prev => ({
          ...prev,
          original_invoice_number: saleDetails.bill_number || '',
          party_name: saleDetails.customer_name || '',
          party_contact: saleDetails.customer_contact || '',
          party_address: saleDetails.customer_address || '',
          party_gstin: saleDetails.customer_gstin || '',
          party_state: saleDetails.customer_state || '',
          party_city: saleDetails.customer_city || '',
          items: saleDetails.items?.map(item => ({
            item_id: item.item_id || item.id,
            item_name: item.item_name,
            hsn_code: item.hsn_code || '',
            original_quantity: item.quantity || 0,
            return_quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            discount: item.discount || 0,
            taxable_amount: item.total_price || 0,
            gst_percentage: item.gst_percentage || 0,
            cgst_amount: item.cgst_amount || 0,
            sgst_amount: item.sgst_amount || 0,
            igst_amount: item.igst_amount || 0,
            total_amount: item.total_price || 0,
            item_condition: '',
            remarks: '',
            status_code: 0,
            original_sale_item_id: item.id || null,
          })) || [],
        }));
      }
    } else if (formData.reference_type === 'purchase' && value) {
      const purchaseDetails = await window.electronAPI.getPurchaseDetails(Number(value));
      if (purchaseDetails && purchaseDetails.purchase) {
        const p = purchaseDetails.purchase;
        setFormData(prev => ({
          ...prev,
          original_invoice_number: p.invoice_number || '',
          party_name: p.supplier_name || '',
          party_contact: p.supplier_contact || '',
          party_address: p.supplier_address || '',
          party_gstin: p.supplier_gstin || '',
          party_state: p.supplier_state || '',
          party_city: p.supplier_city || '',
          items: purchaseDetails.items?.map(item => ({
            item_id: item.item_id || item.id,
            item_name: item.item_name,
            hsn_code: item.hsn_code || '',
            original_quantity: item.quantity || 0,
            return_quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            discount: item.discount || 0,
            taxable_amount: item.total_price || 0,
            gst_percentage: item.gst_percentage || 0,
            cgst_amount: item.cgst_amount || 0,
            sgst_amount: item.sgst_amount || 0,
            igst_amount: item.igst_amount || 0,
            total_amount: item.total_price || 0,
            item_condition: '',
            remarks: '',
            status_code: 0,
            original_purchase_item_id: item.id || null,
          })) || [],
        }));
      }
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: '',
          item_name: '',
          hsn_code: '',
          original_quantity: '',
          return_quantity: '',
          unit_price: '',
          discount: '',
          taxable_amount: '',
          gst_percentage: '',
          cgst_amount: '',
          sgst_amount: '',
          igst_amount: '',
          total_amount: '',
          item_condition: '',
          remarks: '',
          status_code: 0
        }
      ]
    }));
  };

  const handleItemSelect = (idx, itemIdx) => {
    const selected = getFiltered(itemsList, itemSearch[itemIdx])[idx];
    setFormData(prev => {
      const items = [...prev.items];
      items[itemIdx].item_id = selected.id;
      items[itemIdx].item_name = selected.name;
      items[itemIdx].hsn_code = selected.hsn_code || '';
      items[itemIdx].unit_price = selected.mrp || '';
      items[itemIdx].gst_percentage = selected.gst_percentage || '';
      return { ...prev, items };
    });
    setItemSearch(search => ({ ...search, [itemIdx]: selected.name }));
    setShowItemDropdown(show => ({ ...show, [itemIdx]: false }));
  };

  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const items = [...prev.items];
      items[idx][name] = value;
      return { ...prev, items };
    });
  };

  const handleRemoveItem = idx => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
    setItemSearch(search => {
      const copy = { ...search };
      delete copy[idx];
      return copy;
    });
    setShowItemDropdown(show => {
      const copy = { ...show };
      delete copy[idx];
      return copy;
    });
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.note_number || !formData.note_type || !formData.reference_type || !formData.party_name || !formData.note_date || formData.items.length === 0) {
      toast.error('Please fill all required fields and add at least one item.');
      return;
    }

    const cleanSaleId = formData.sale_id === "" ? null : Number(formData.sale_id);
    const cleanPurchaseId = formData.purchase_id === "" ? null : Number(formData.purchase_id);

    const cleanForm = {
      ...formData,
      sale_id: cleanSaleId,
      purchase_id: cleanPurchaseId,
      subtotal: Number(formData.subtotal) || 0,
      discount: Number(formData.discount) || 0,
      cgst_total: Number(formData.cgst_total) || 0,
      sgst_total: Number(formData.sgst_total) || 0,
      igst_total: Number(formData.igst_total) || 0,
      other_charges: Number(formData.other_charges) || 0,
      rounding_off: Number(formData.rounding_off) || 0,
      total_amount: Number(formData.total_amount) || 0,
      items: formData.items.map(item => {
        const summary = calculateItemSummary(item);
        return {
          ...item,
          item_id: item.item_id === "" ? null : Number(item.item_id),
          original_sale_item_id: item.original_sale_item_id === "" ? null : Number(item.original_sale_item_id),
          original_purchase_item_id: item.original_purchase_item_id === "" ? null : Number(item.original_purchase_item_id),
          original_quantity: Number(item.original_quantity) || 0,
          return_quantity: Number(item.return_quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
          taxable_amount: Number(summary.taxableAmount) || 0,
          gst_percentage: Number(item.gst_percentage) || 0,
          cgst_amount: Number(summary.cgstAmount) || 0,
          sgst_amount: Number(summary.sgstAmount) || 0,
          igst_amount: Number(item.igst_amount) || 0,
          total_amount: Number(summary.totalAmount) || 0,
        };
      })
    };

    try {
      setLoading(true);
      const res = isEdit
        ? await window.electronAPI.updateCreditDebitNote({ ...cleanForm, id: parseInt(id) })
        : await window.electronAPI.createCreditDebitNote(cleanForm);

      if (res.success) {
        toast.success(isEdit ? 'Note updated successfully' : 'Note created successfully');
        navigate('/credit-debit-note');
      } else {
        toast.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Error saving note');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading note data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/credit-debit-note')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Notes
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit' : 'Create'} Credit/Debit Note
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Note Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Note Type *</label>
              <select name="note_type" value={formData.note_type} onChange={handleChange} className={inputClass} required>
                <option value="credit">Credit Note</option>
                <option value="debit">Debit Note</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Note Number *</label>
              <input type="text" name="note_number" value={formData.note_number} onChange={handleChange} className={inputClass} placeholder="CN-2024-001" required />
            </div>
            <div>
              <label className={labelClass}>Note Date *</label>
              <input type="date" name="note_date" value={formData.note_date} onChange={handleChange} className={inputClass} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Party Name</label>
              <input type="text" name="party_name" value={formData.party_name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reason</label>
              <input type="text" name="reason" value={formData.reason} onChange={handleChange} className={inputClass} placeholder="e.g. Damaged Goods" />
            </div>
          </div>
        </div>

        {/* Section 2: Reference Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reference Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Reference Type *</label>
              <select name="reference_type" value={formData.reference_type} onChange={handleChange} className={inputClass}>
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Select Reference Bill</label>
              {formData.reference_type === 'sale' ? (
                <select name="sale_id" value={formData.sale_id} onChange={handleReferenceSelect} className={inputClass}>
                  <option value="">-- Select Sale --</option>
                  {salesList.map(sale => (
                    <option key={sale.id} value={sale.id}>{sale.bill_number} - {sale.customer_name}</option>
                  ))}
                </select>
              ) : (
                <select name="purchase_id" value={formData.purchase_id} onChange={handleReferenceSelect} className={inputClass}>
                  <option value="">-- Select Purchase --</option>
                  {purchaseList.map(purchase => (
                    <option key={purchase.id} value={purchase.id}>{purchase.invoice_number} - {purchase.supplier_name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Original Invoice No</label>
              <input type="text" name="original_invoice_number" value={formData.original_invoice_number} onChange={handleChange} className={inputClass} readOnly />
            </div>
          </div>
        </div>

        {/* Section 3: Items Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items *</h2>
            <button type="button" onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center">
              <PlusCircle className="w-4 h-4 mr-1.5" /> Add Item
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No items added yet. Click "Add Item" to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Item Name</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">HSN</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Orig. Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Ret. Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Price</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Disc %</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">GST %</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">Taxable</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => {
                    const filteredItems = getFiltered(itemsList, itemSearch[idx] || item.item_name || '');
                    const summary = itemSummaries[idx];
                    return (
                      <tr key={idx} className="border-b">
                        <td className="px-2 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={itemSearch[idx] || item.item_name}
                              onChange={e => {
                                setItemSearch(search => ({ ...search, [idx]: e.target.value }));
                                setShowItemDropdown(show => ({ ...show, [idx]: true }));
                              }}
                              onFocus={() => setShowItemDropdown(show => ({ ...show, [idx]: true }))}
                              onBlur={() => setTimeout(() => setShowItemDropdown(show => ({ ...show, [idx]: false })), 100)}
                              placeholder="Search Item"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              autoComplete="off"
                            />
                            {showItemDropdown[idx] && filteredItems.length > 0 && (
                              <ul className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-40 rounded-md py-1 text-xs overflow-auto border border-gray-200">
                                {filteredItems.map((itm, iidx) => (
                                  <li
                                    key={itm.id}
                                    className="cursor-pointer select-none py-1.5 px-2 hover:bg-blue-50 text-gray-900"
                                    onMouseDown={() => handleItemSelect(iidx, idx)}
                                  >
                                    {itm.name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" name="hsn_code" value={item.hsn_code} className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100" readOnly />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" name="original_quantity" value={item.original_quantity} className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100" readOnly />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" name="return_quantity" value={item.return_quantity} onChange={e => handleItemChange(idx, e)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-yellow-50" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" name="unit_price" value={item.unit_price} onChange={e => handleItemChange(idx, e)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" name="discount" value={item.discount} onChange={e => handleItemChange(idx, e)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" name="gst_percentage" value={item.gst_percentage} onChange={e => handleItemChange(idx, e)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" value={summary?.taxableAmount.toFixed(2) || '0.00'} className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100 font-semibold" readOnly />
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-600 hover:text-red-800 p-1">
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

        {/* Section 4: Financials */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Totals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Subtotal</label>
              <input type="number" value={formData.subtotal.toFixed(2)} className={`${inputClass} bg-gray-100`} readOnly />
            </div>
            <div>
              <label className={labelClass}>CGST</label>
              <input type="number" value={formData.cgst_total.toFixed(2)} className={`${inputClass} bg-gray-100`} readOnly />
            </div>
            <div>
              <label className={labelClass}>SGST</label>
              <input type="number" value={formData.sgst_total.toFixed(2)} className={`${inputClass} bg-gray-100`} readOnly />
            </div>
            <div>
              <label className={labelClass}>IGST</label>
              <input type="number" name="igst_total" value={formData.igst_total} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rounding Off</label>
              <input type="number" value={formData.rounding_off.toFixed(2)} className={`${inputClass} bg-gray-100`} readOnly />
            </div>
            <div>
              <label className={labelClass}>Other Charges</label>
              <input type="number" name="other_charges" value={formData.other_charges} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Total Amount</label>
              <input type="number" value={formData.total_amount} className="w-full px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-lg font-bold text-blue-700" readOnly />
            </div>
          </div>
        </div>

        {/* Section 5: Additional Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Settlement Method</label>
              <input type="text" name="settlement_method" value={formData.settlement_method} onChange={handleChange} className={inputClass} placeholder="Cash/Bank" />
            </div>
            <div>
              <label className={labelClass}>Settlement Date</label>
              <input type="date" name="settlement_date" value={formData.settlement_date} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Remarks</label>
              <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className={inputClass}></textarea>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/credit-debit-note')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : (isEdit ? 'Update Note' : 'Create Note')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreditDebitNoteEdit;
