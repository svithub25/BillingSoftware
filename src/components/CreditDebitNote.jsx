import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, FileText, X, CheckCircle, Search, Calendar, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Helper for dropdown search
const getFiltered = (list, search) =>
  list.filter(item => item.name.toLowerCase().includes((search || '').toLowerCase()));

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
  subtotal: '',
  discount: '',
  cgst_total: '',
  sgst_total: '',
  igst_total: '',
  other_charges: '',
  rounding_off: '',
  total_amount: '',
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

// --- Styled Components / Classes ---
const inputClass = "block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 transition duration-150 ease-in-out";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
const sectionTitleClass = "text-lg font-medium text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6 flex items-center";

const CreditDebitNote = () => {
  const [notes, setNotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Dropdown states
  const [parties, setParties] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partyDropdownIdx, setPartyDropdownIdx] = useState(0);

  // Sale/Purchase Lists
  const [salesList, setSalesList] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);

  // Item states
  const [itemSearch, setItemSearch] = useState({});
  const [showItemDropdown, setShowItemDropdown] = useState({});
  const [itemDropdownIdx, setItemDropdownIdx] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const notesRes = await window.electronAPI.getCreditDebitNotes({ type: 'all', search: '' });
      setNotes(notesRes || []);
      const partyRes = await window.electronAPI.getAllParties?.() || [];
      setParties(partyRes);
      const itemsRes = await window.electronAPI.getInventory?.() || [];
      setItemsList(itemsRes);
      const salesRes = await window.electronAPI.getSalesHistory?.() || [];
      setSalesList(salesRes);
      const purchaseRes = await window.electronAPI.getPurchaseHistory?.() || [];
      console.log('Fetched purchase history:', salesRes);
      setPurchaseList(purchaseRes);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Handlers (Exact Logic Preserved)
  const filteredParties = getFiltered(parties, partySearch);

  const handlePartySelect = idx => {
    const party = filteredParties[idx];
    setFormData(prev => ({
      ...prev,
      party_name: party.name,
      party_contact: party.contact || '',
      party_address: party.address || '',
      party_gstin: party.gstin || '',
      party_state: party.state || '',
      party_city: party.city || ''
    }));
    setPartySearch(party.name);
    setShowPartyDropdown(false);
  };

  const handleReferenceSelect = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formData.reference_type === 'sale' && value) {
      // Fetch sale details
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
          subtotal: saleDetails.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0,
          discount: saleDetails.discount || 0,
          rounding_off: saleDetails.rounding_off || 0,
          total_amount: saleDetails.total_amount || 0,
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
      // Fetch purchase details
      const purchaseDetails = await window.electronAPI.getPurchaseDetails(Number(value));
      console.log('Fetched purchase details:', purchaseDetails);
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
          subtotal: p.subtotal || 0,
          discount: p.discount || 0,
          rounding_off: p.rounding_off || 0,
          total_amount: p.total_amount || 0,
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
      items[itemIdx].category_id = selected.category_id || '';
      items[itemIdx].unit = selected.unit || '';
      items[itemIdx].sku = selected.sku || '';
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
    setItemDropdownIdx(idxObj => {
      const copy = { ...idxObj };
      delete copy[idx];
      return copy;
    });
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.note_number || !formData.note_type || !formData.reference_type || !formData.party_name || !formData.note_date || !formData.subtotal || !formData.total_amount || formData.items.length === 0) {
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
      items: formData.items.map(item => ({
        ...item,
        item_id: item.item_id === "" ? null : Number(item.item_id),
        original_sale_item_id: item.original_sale_item_id === "" ? null : Number(item.original_sale_item_id),
        original_purchase_item_id: item.original_purchase_item_id === "" ? null : Number(item.original_purchase_item_id),
        original_quantity: Number(item.original_quantity) || 0,
        return_quantity: Number(item.return_quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        discount: Number(item.discount) || 0,
        taxable_amount: Number(item.taxable_amount) || 0,
        gst_percentage: Number(item.gst_percentage) || 0,
        cgst_amount: Number(item.cgst_amount) || 0,
        sgst_amount: Number(item.sgst_amount) || 0,
        igst_amount: Number(item.igst_amount) || 0,
        total_amount: Number(item.total_amount) || 0,
      }))
    };

    const res = await window.electronAPI.createCreditDebitNote(cleanForm);
    if (res.success) {
      toast.success('Note saved successfully');
      setIsModalOpen(false);
      setFormData(initialForm);
      setItemSearch({});
      setShowItemDropdown({});
      setItemDropdownIdx({});
      const result = await window.electronAPI.getCreditDebitNotes({ type: 'all', search: '' });
      setNotes(result || []);
    } else {
      toast.error('Failed to save note');
    }
  };

  const handleDelete = async id => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      const res = await window.electronAPI.deleteCreditDebitNote(id);
      if (res.success) {
        toast.info('Note deleted');
        setNotes(notes.filter(n => n.id !== id));
      }
    }
  };

  const filteredNotes = notes.filter(note =>
    (note.note_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.party_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.original_invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans text-slate-900">

      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credit & Debit Notes</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your financial adjustments and returns.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Note
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Search Bar */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search notes, parties, or invoices..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Note No', 'Type', 'Party', 'Date', 'Invoice Ref', 'Amount', 'Status', 'Actions'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      No notes found matching your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNotes.map(note => (
                  <tr key={note.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{note.note_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${note.note_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {note.note_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{note.party_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{note.note_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{note.original_invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">₹{parseFloat(note.total_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${note.status_code === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {note.status_code === 0 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-full hover:bg-red-50"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIXED MODAL STRUCTURE */}
      {isModalOpen && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">

          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

          {/* Modal Positioning Wrapper */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">

              {/* Modal Panel */}
              <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-5xl flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-none">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg leading-6 font-bold text-slate-900" id="modal-title">New Credit/Debit Note</h3>
                      <p className="text-xs text-slate-500">Fill in the details to create a new financial record.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50">

                  {/* Section 1: Note Details */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                      <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                      General Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Note Type</label>
                        <select name="note_type" value={formData.note_type} onChange={handleChange} className={inputClass}>
                          <option value="credit">Credit Note</option>
                          <option value="debit">Debit Note</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Note Number</label>
                        <input type="text" name="note_number" value={formData.note_number} onChange={handleChange} className={inputClass} placeholder="CN-2024-001" required />
                      </div>
                      <div>
                        <label className={labelClass}>Note Date</label>
                        <input type="date" name="note_date" value={formData.note_date} onChange={handleChange} className={inputClass} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      {/* Party Search */}
                      <div className="relative">
                        <label className={labelClass}>Party Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={partySearch || formData.party_name}
                            onChange={e => {
                              setPartySearch(e.target.value);
                              setShowPartyDropdown(true);
                              setPartyDropdownIdx(0);
                            }}
                            onFocus={() => setShowPartyDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                            placeholder="Search for a party..."
                            className={`${inputClass} pl-10`}
                            autoComplete="off"
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        </div>
                        {showPartyDropdown && filteredParties.length > 0 && (
                          <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-48 rounded-md py-1 text-sm overflow-auto ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {filteredParties.map((party, idx) => (
                              <li
                                key={party.id}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${idx === partyDropdownIdx ? 'bg-indigo-50 text-indigo-900' : 'text-slate-900 hover:bg-slate-50'}`}
                                onMouseDown={() => handlePartySelect(idx)}
                              >
                                <span className="block truncate font-medium">{party.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Reason</label>
                        <input type="text" name="reason" value={formData.reason} onChange={handleChange} className={inputClass} placeholder="e.g. Damaged Goods" />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Reference */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                      <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                      Reference Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Reference Type</label>
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
                        <label className={labelClass}>Original Invoice No (Manual)</label>
                        <input type="text" name="original_invoice_number" value={formData.original_invoice_number} onChange={handleChange} className={inputClass} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Items Table */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center">
                        <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                        Items
                      </h4>
                      <button type="button" onClick={handleAddItem} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                        <PlusCircle className="w-4 h-4 mr-1.5" /> Add Item
                      </button>
                    </div>

                    {formData.items.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 text-sm">No items added yet. Click "Add Item" to begin.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Custom Header for Items */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-1">
                          <div className="col-span-3">Item Name</div>
                          <div className="col-span-1">HSN</div>
                          <div className="col-span-1">Orig. Qty</div>
                          <div className="col-span-1">Ret. Qty</div>
                          <div className="col-span-2">Price</div>
                          <div className="col-span-1">GST %</div>
                          <div className="col-span-2">Taxable</div>
                          <div className="col-span-1"></div>
                        </div>

                        {formData.items.map((item, idx) => {
                          const filteredItems = getFiltered(itemsList, itemSearch[idx] || item.item_name || '');
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-slate-50 p-2 rounded-md border border-slate-100 relative group">

                              {/* Item Search Dropdown */}
                              <div className="col-span-3 relative">
                                <input
                                  type="text"
                                  value={itemSearch[idx] || item.item_name}
                                  onChange={e => {
                                    setItemSearch(search => ({ ...search, [idx]: e.target.value }));
                                    setShowItemDropdown(show => ({ ...show, [idx]: true }));
                                    setItemDropdownIdx(idxObj => ({ ...idxObj, [idx]: 0 }));
                                  }}
                                  onFocus={() => setShowItemDropdown(show => ({ ...show, [idx]: true }))}
                                  onBlur={() => setTimeout(() => setShowItemDropdown(show => ({ ...show, [idx]: false })), 100)}
                                  placeholder="Search Item"
                                  className="block w-full rounded border-slate-300 text-xs py-1.5 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  autoComplete="off"
                                />
                                {showItemDropdown[idx] && filteredItems.length > 0 && (
                                  <ul className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-40 rounded-md py-1 text-xs overflow-auto ring-1 ring-black ring-opacity-5">
                                    {filteredItems.map((itm, iidx) => (
                                      <li
                                        key={itm.id}
                                        className={`cursor-pointer select-none py-1.5 px-2 ${iidx === itemDropdownIdx[idx] ? 'bg-indigo-50 text-indigo-900' : 'text-slate-900 hover:bg-slate-50'}`}
                                        onMouseDown={() => handleItemSelect(iidx, idx)}
                                      >
                                        {itm.name}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="col-span-1">
                                <input type="text" name="hsn_code" value={item.hsn_code} onChange={e => handleItemChange(idx, e)} placeholder="HSN" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2" />
                              </div>
                              <div className="col-span-1">
                                <input type="number" name="original_quantity" value={item.original_quantity} onChange={e => handleItemChange(idx, e)} placeholder="0" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2" />
                              </div>
                              <div className="col-span-1">
                                <input type="number" name="return_quantity" value={item.return_quantity} onChange={e => handleItemChange(idx, e)} placeholder="0" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2 bg-yellow-50" />
                              </div>
                              <div className="col-span-2">
                                <input type="number" name="unit_price" value={item.unit_price} onChange={e => handleItemChange(idx, e)} placeholder="0.00" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2" />
                              </div>
                              <div className="col-span-1">
                                <input type="number" name="gst_percentage" value={item.gst_percentage} onChange={e => handleItemChange(idx, e)} placeholder="%" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2" />
                              </div>
                              <div className="col-span-2">
                                <input type="number" name="taxable_amount" value={item.taxable_amount} onChange={e => handleItemChange(idx, e)} placeholder="0.00" className="block w-full rounded border-slate-300 text-xs py-1.5 px-2 font-semibold text-slate-700" />
                              </div>
                              <div className="col-span-1 flex justify-end items-center h-full">
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-600 transition-colors p-1">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Financials & Settlement */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Financials */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                        <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                        Financial Totals
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Subtotal</label>
                            <input type="number" name="subtotal" value={formData.subtotal} onChange={handleChange} className={inputClass} required />
                          </div>
                          <div>
                            <label className={labelClass}>Discount</label>
                            <input type="number" name="discount" value={formData.discount} onChange={handleChange} className={inputClass} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className={labelClass}>CGST</label>
                            <input type="number" name="cgst_total" value={formData.cgst_total} onChange={handleChange} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>SGST</label>
                            <input type="number" name="sgst_total" value={formData.sgst_total} onChange={handleChange} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>IGST</label>
                            <input type="number" name="igst_total" value={formData.igst_total} onChange={handleChange} className={inputClass} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Rounding Off</label>
                            <input type="number" name="rounding_off" value={formData.rounding_off} onChange={handleChange} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Other Charges</label>
                            <input type="number" name="other_charges" value={formData.other_charges} onChange={handleChange} className={inputClass} />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <label className="block text-sm font-bold text-slate-900 mb-1">Total Amount (Net)</label>
                          <input type="number" name="total_amount" value={formData.total_amount} onChange={handleChange} className="block w-full rounded-lg border-indigo-300 bg-indigo-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-indigo-700 py-3 px-3" />
                        </div>
                      </div>
                    </div>

                    {/* Settlement & Approval */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center">
                        <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                        Settlement & Approval
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className={labelClass}>Settlement Method</label>
                          <input type="text" name="settlement_method" value={formData.settlement_method} onChange={handleChange} className={inputClass} placeholder="Cash/Bank" />
                        </div>
                        <div>
                          <label className={labelClass}>Ref #</label>
                          <input type="text" name="settlement_reference" value={formData.settlement_reference} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className={labelClass}>Settlement Date</label>
                        <input type="date" name="settlement_date" value={formData.settlement_date} onChange={handleChange} className={inputClass} />
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Approved By</label>
                            <input type="text" name="approved_by" value={formData.approved_by} onChange={handleChange} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Approved At</label>
                            <input type="datetime-local" name="approved_at" value={formData.approved_at} onChange={handleChange} className={inputClass} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className={labelClass}>Remarks</label>
                          <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className={inputClass}></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                </form>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 flex-none">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-white hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div> 
      )}
    </div>
  );
};

export default CreditDebitNote;