import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Edit3,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  Eye,
  RefreshCw,
  Trash2,
  Minus,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import BillPDF from './BillPDF';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SalesHistory = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: '',
    item: '',
    salesman: '',
    billNumber: ''
  });
  const [items, setItems] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const billPdfRef = useRef();
  const debounceTimeout = useRef();
  const [deletePin, setDeletePin] = useState('');
  const [showDeletePinModal, setShowDeletePinModal] = useState(false);
  const [editingPrices, setEditingPrices] = useState({});

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSalesHistory();
    fetchInventory();
    fetchSalesmen();
  }, []);

  const fetchInventory = async () => {
    try {
      if (window.electronAPI) {
        const inventory = await window.electronAPI.getItems();
        setItems(inventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
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

  const highlightText = (text, highlight) => {
    if (!highlight) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  const fetchFiltered = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getFilteredSales(filters);
      data.sort((a, b) => {
        const getBillNum = bill => {
          const parts = bill.split('/');
          return parseInt(parts[parts.length - 1], 10) || 0;
        };
        return getBillNum(b.bill_number) - getBillNum(a.bill_number);
      });
      setSales(data);
      setCurrentPage(1); // Reset to first page when filters change
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      const backendFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate
      };

      const hasBackendFilters = Object.values(backendFilters).some(val => val);
      if (hasBackendFilters) {
        fetchFiltered();
      } else {
        loadSalesHistory();
      }
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [filters.startDate, filters.endDate]);

  const loadSalesHistory = async () => {
    try {
      const data = await window.electronAPI.getSalesHistory();
      console.log('Fetched sales history:', data);
      data.sort((a, b) => {
        const getBillNum = bill => {
          const parts = bill.split('/');
          return parseInt(parts[parts.length - 1], 10) || 0;
        };
        return getBillNum(b.bill_number) - getBillNum(a.bill_number);
      });
      setSales(data);
      setCurrentPage(1); // Reset to first page on fresh load
    } catch (error) {
      console.error('Error loading sales history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      customer: '',
      item: '',
      salesman: '',
      billNumber: ''
    });
    setCurrentPage(1);
    loadSalesHistory();
  };

  const viewSaleDetails = (saleId) => {
    navigate(`/sale/${saleId}`);
  };

  const editSale = (saleId) => {
    navigate(`/saleedit/${saleId}`);
  };

  const handleDeleteSale = async (saleId) => {
    setShowDeletePinModal(true);
    setDeleteId(saleId);
  };

  const confirmDeleteWithPin = async () => {
    const isValid = await window.electronAPI.verifyPin(deletePin);
    if (isValid) {
      const result = await window.electronAPI.deleteBill(deleteId);
      if (result.success) {
        toast.success('Sale deleted!');
        loadSalesHistory();
        fetchFiltered();
      } else {
        toast.error(result.message || 'Cannot delete sale.');
      }
      setShowDeletePinModal(false);
      setDeleteId(null);
      setDeletePin('');
    } else {
      toast.error('Invalid PIN');
    }
  };

  const handlePriceChange = (saleId, itemId, newPrice) => {
    setEditingPrices(prev => ({
      ...prev,
      [`${saleId}-${itemId}`]: newPrice
    }));
  };

  const savePriceChange = async (saleId, itemId) => {
    try {
      const newPrice = editingPrices[`${saleId}-${itemId}`];
      if (!newPrice || newPrice <= 0) {
        toast.error('Please enter a valid price');
        return;
      }

      await window.electronAPI.updateSaleItemPrice(saleId, itemId, newPrice);

      setSales(prevSales =>
        prevSales.map(sale => {
          if (sale.id === saleId) {
            const updatedSale = { ...sale };
            return updatedSale;
          }
          return sale;
        })
      );

      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[`${saleId}-${itemId}`];
        return newState;
      });

      toast.success('Price updated successfully');
      loadSalesHistory();
    } catch (error) {
      toast.error('Error updating price');
      console.error('Error updating price:', error);
    }
  };



  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  };

  const getTotalGST = () => {
    return filteredSales.reduce((sum, sale) => sum + (sale.cgst_total || 0) + (sale.sgst_total || 0), 0);
  };

  const handleReprintBill = async (saleId) => {
    try {
      // Fetch sale details
      const saleDetails = await window.electronAPI.getSaleDetails(saleId);
      console.log('sales details are', saleDetails)
      if (!saleDetails) {
        toast.error('Sale details not found');
        return;
      }

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

      // Calculate totals from sale details
      const subtotal = saleDetails.items.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );
      const discount = saleDetails.discount || 0;
      const roundingOff = saleDetails.rounding_off || 0;
      const total = saleDetails.total_amount || 0;

      // Generate QR code for UPI payment if UPI ID exists
      let qrCodeDataUrl = null;
      if (companyInfo?.upi_id && companyInfo.upi_id.trim() !== '') {
        const upiString = `upi://pay?pa=${companyInfo.upi_id}&pn=${encodeURIComponent(companyInfo.company_name)}&am=${total}&cu=INR`;
        qrCodeDataUrl = await QRCode.toDataURL(upiString, {
          width: 256,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }

      // Prepare customer info
      const customer = {
        name: saleDetails.customer_name,
        contact: saleDetails.customer_contact,
        address: saleDetails.customer_address,
        gstin: saleDetails.customer_gstin
      };

      // Prepare shipped to info
      const shippedTo = {
        name: saleDetails.shipped_to_name || '',
        contact: saleDetails.shipped_to_contact || '',
        address: saleDetails.shipped_to_address || '',
        gstin: saleDetails.shipped_to_gstin || ''
      };

      // Prepare items
      const billItems = saleDetails.items.map(item => ({
        hsn_code: item.hsn_code,
        sku: item.sku,
        name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        discount_type: item.discount_type || 'percent',
        total_price: item.total_price,
        batches: item.batches || []
      }));

      // Generate PDF using @react-pdf/renderer
      const pdfDoc = pdf(
        <BillPDF
          billNumber={saleDetails.bill_number}
          customer={customer}
          items={billItems}
          discount={discount}
          discountType={saleDetails.discount_type || 'percent'}
          subtotal={subtotal}
          roundingOff={roundingOff}
          total={total}
          sale_type={saleDetails.sale_type || 'customer'}
          salesman_name={saleDetails.salesman || ''}
          salesman_contact={saleDetails.salesman_contact_info || ''}
          salesman_address={saleDetails.salesman_address || ''}
          note={saleDetails.narration || ''}
          isShippedDifferent={saleDetails.is_shipped_different === 1}
          shippedTo={shippedTo}
          companyInfo={companyInfo}
          logoDataUrl={logoDataUrl}
          qrCodeDataUrl={qrCodeDataUrl}
          billDate={saleDetails.sale_date}
        />
      );

      // Convert to array buffer for printing
      const blob = await pdfDoc.toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      const result = await window.electronAPI.printPdf(arrayBuffer);

      if (result.success) {
        toast.success('Invoice sent to printer!');
      } else {
        toast.error('Failed to print: ' + result.error);
      }
    } catch (error) {
      console.error('Error reprinting bill:', error);
      toast.error('Error reprinting bill: ' + error.message);
    }
  };

  const handlePaidChange = async (saleId, isPaid) => {
    if (isPaid) {
      const sale = sales.find(s => s.id === saleId);
      setPendingPaymentSale(sale);
      setPaymentForm({
        ...paymentForm,
        amount: sale.total_amount,
        paymentDetails: {}
      });
      setShowPaymentModal(true);
    } else {
      try {
        const history = await window.electronAPI.getPaymentDetails(saleId);
        setPaymentHistory(history);
        setShowPaymentHistoryModal(true);
      } catch (error) {
        toast.error('Error loading payment history');
      }
    }
  };

  const handleApproveChange = async (saleId, isApproved) => {
    if (isApproved) {
      try {
        const data = await window.electronAPI.getSalePaymentForApproval(saleId);

        if (!data.hasPayment) {
          toast.error('Cannot approve: Sale is not marked as paid');
          return;
        }

        setApprovalData(data);
        setPendingApprovalSale(saleId);
        setShowApprovePinModal(true);
      } catch (error) {
        toast.error('Error loading payment data for approval');
      }
    } else {
      try {
        const history = await window.electronAPI.getApprovalHistory(saleId);
        setApprovalHistory(history);
        setShowApprovalHistoryModal(true);
      } catch (error) {
        toast.error('Error loading approval history');
      }
    }
  };

  const updateApprovalStatus = async (saleId, isApproved) => {
    try {
      const success = await window.electronAPI.updateSaleApprovedStatus(saleId, isApproved);
      if (success) {
        setSales(prevSales =>
          prevSales.map(sale =>
            sale.id === saleId ? { ...sale, is_approved: isApproved ? 1 : 0 } : sale
          )
        );
        toast.success(isApproved ? 'Sale approved' : 'Approval removed');
      }
    } catch (error) {
      toast.error('Error updating approval status');
    }
  };

  const handlePinSubmit = async () => {
    try {
      const isValid = await window.electronAPI.verifyApprovePin(approvePin);
      if (isValid) {
        await updateApprovalStatus(pendingApprovalSale, true);
        setShowApprovePinModal(false);
        setApprovePin('');
        setPendingApprovalSale(null);
      } else {
        toast.error('Invalid PIN');
      }
    } catch (error) {
      toast.error('Error verifying PIN');
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      const result = await window.electronAPI.savePayment({
        saleId: pendingPaymentSale.id,
        paymentMethod: paymentForm.paymentMethod,
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentDetails: paymentForm.paymentDetails
      });

      if (result.success) {
        setSales(prevSales =>
          prevSales.map(sale =>
            sale.id === pendingPaymentSale.id
              ? { ...sale, is_paid: 1, payment_method: paymentForm.paymentMethod }
              : sale
          )
        );
        setShowPaymentModal(false);
        setPendingPaymentSale(null);
        setPaymentForm({
          paymentMethod: 'cash',
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentDetails: {}
        });
        toast.success('Payment recorded successfully');
      }
    } catch (error) {
      toast.error('Error recording payment');
    }
  };

  // --- FILTERED SALES (applies all filters) ---
  const filteredSales = sales.filter(sale => {
    const matchStartDate = !filters.startDate || new Date(sale.sale_date) >= new Date(filters.startDate);
    const matchEndDate = !filters.endDate || new Date(sale.sale_date) <= new Date(filters.endDate);
    const matchCustomer = !filters.customer || (sale.customer_name && sale.customer_name.toLowerCase().includes(filters.customer.toLowerCase()));
    const matchItem = !filters.item ||
      (sale.item_names && sale.item_names.toLowerCase().includes(filters.item.toLowerCase()));
    const matchSalesman = !filters.salesman || String(sale.salesman_id) === String(filters.salesman);
    const matchBill = !filters.billNumber || sale.bill_number.toLowerCase().includes(filters.billNumber.toLowerCase());

    return matchStartDate && matchEndDate && matchCustomer && matchItem && matchSalesman && matchBill;
  });

  // --- PAGINATION LOGIC ---
  useEffect(() => {
    const total = Math.ceil(filteredSales.length / itemsPerPage);
    setTotalPages(total);

    // If current page exceeds total pages after filtering, reset to page 1
    if (currentPage > total && total > 0) {
      setCurrentPage(1);
    }
  }, [filteredSales.length, itemsPerPage, currentPage]);

  // Get current page data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-600">View and manage all sales transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{getTotalSales().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total GST</p>
              <p className="text-2xl font-bold text-gray-900">₹{getTotalGST().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Sale Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{filteredSales.length > 0 ? (getTotalSales() / filteredSales.length).toFixed(0) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <input
              type="text"
              value={filters.customer}
              autoFocus
              onChange={(e) => { e.preventDefault(); setFilters({ ...filters, customer: e.target.value }) }}
              placeholder="Search by customer name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
            <select
              value={filters.item}
              onChange={(e) => setFilters({ ...filters, item: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            >
              <option value="">Select Item</option>
              {items.map(inventoryItem => (
                <option key={inventoryItem.id} value={inventoryItem.name}>
                  {inventoryItem.name}
                </option>
              ))}
            </select>
          </div> */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salesman</label>
            <select
              value={filters.salesman}
              onChange={e => setFilters({ ...filters, salesman: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Number</label>
            <input
              type="text"
              value={filters.billNumber}
              onChange={e => setFilters({ ...filters, billNumber: e.target.value })}
              placeholder="Enter bill number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

        </div>

        <div className="flex space-x-3">
          <button
            onClick={clearFilters}
            className="flex items-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Sales Records</h2>
          </div>
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSales.length)} of {filteredSales.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salesman
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {highlightText(sale.bill_number, filters.billNumber)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {sale.customer_name}
                      </div>
                      {sale.customer_contact && (
                        <div className="text-sm text-gray-500">{sale.customer_contact}</div>
                      )}
                      {/* Show shipped to if different */}
                      {sale.is_shipped_different === 1 && (
                        <div className="mt-1 text-xs text-blue-700">
                          <span className="font-semibold">Shipped To:</span> {sale.shipped_to_name}
                          {sale.shipped_to_contact && <> | {sale.shipped_to_contact}</>}
                          {sale.shipped_to_address && (
                            <div className="text-xs text-blue-500">{sale.shipped_to_address}</div>
                          )}
                          {sale.shipped_to_gstin && (
                            <div className="text-xs text-blue-500">GSTIN: {sale.shipped_to_gstin}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.item_count} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.salesman}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{sale.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col items-start">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        sale.payment_status === 'partially_paid' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {sale.payment_status ? sale.payment_status.replace('_', ' ').toUpperCase() : 'PENDING'}
                      </span>
                      {sale.payment_status === 'partially_paid' && (
                        <span className="text-xs text-gray-500 mt-1 ml-1 font-medium">
                          Paid: ₹{(sale.paid_amount || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      onClick={() => viewSaleDetails(sale.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editSale(sale.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Edit Sale"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteId(sale.id);
                        setConfirmDeleteOpen(true);
                      }}
                      className="text-black-600 hover:text-black-900"
                      title="Delete Sale"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReprintBill(sale.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Reprint Bill"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentSales.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sales records found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-2 rounded-lg mr-2 ${currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex gap-1">
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="px-2 py-2">...</span>}
                  </>
                )}

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 rounded-lg ${currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2 py-2">...</span>}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center px-3 py-2 rounded-lg ml-2 ${currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Sale</h2>
            <p className="mb-2">
              Are you sure you want to delete this sale?
              <br />
              <span className="text-sm text-gray-700">
                <strong>Bill Number:</strong> {sales.find(s => s.id === deleteId)?.bill_number || 'N/A'}<br />
                <strong>Customer:</strong> {sales.find(s => s.id === deleteId)?.customer_name || 'Counter Sale'}
              </span>
            </p>
            <p className="mb-6 text-xs text-gray-500">
              This will revert inventory for all items in this bill.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setShowDeletePinModal(true);
                  setConfirmDeleteOpen(false);
                }}
              >
                Enter PIN & Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete PIN Modal */}
      {showDeletePinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enter PIN to Delete Sale</h2>
            <input
              type="password"
              value={deletePin}
              onChange={e => setDeletePin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') confirmDeleteWithPin();
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowDeletePinModal(false);
                  setDeletePin('');
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteWithPin}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removed Payment and Approval Modals */}

    </div>
  );
};

export default SalesHistory;