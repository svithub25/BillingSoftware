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
    billNumber: '',
    paymentStatus: '', // New filter
    approvalStatus: '' // New filter
  });
  const [items, setItems] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showApprovePinModal, setShowApprovePinModal] = useState(false);
  const [showApprovalHistoryModal, setShowApprovalHistoryModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [approvePin, setApprovePin] = useState('');
  const [pendingApprovalSale, setPendingApprovalSale] = useState(null);
  const [approvalData, setApprovalData] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentSale, setPendingPaymentSale] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'cash',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentDetails: {}
  });
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
      billNumber: '',
      paymentStatus: '',
      approvalStatus: ''
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
      const saleDetails = await window.electronAPI.getSaleDetails(saleId);
      console.log('Generating PDF for sale:', saleDetails);

      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '210mm';
      pdfContainer.style.zIndex = '-1';
      document.body.appendChild(pdfContainer);

      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(pdfContainer);

        root.render(
          <BillPDF
            billNumber={saleDetails.bill_number}
            customer={{
              name: saleDetails.customer_name,
              contact: saleDetails.customer_contact,
              address: saleDetails.customer_address,
              gstin: saleDetails.customer_gstin
            }}
            items={saleDetails.items.map(item => ({
              hsn_code: item.hsn_code,
              sku: item.sku,
              name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))}
            discount={saleDetails.discount}
            subtotal={saleDetails.items.reduce(
              (sum, item) => sum + item.unit_price * item.quantity,
              0
            )}
            roundingOff={saleDetails.rounding_off}
            total={saleDetails.total_amount}
            sale_type={saleDetails.sale_type}
            salesman_name={saleDetails.salesman || ""}
            salesman_contact={saleDetails.salesman_contact_info || ""}
            salesman_address={saleDetails.salesman_address || ""}
            note={saleDetails.narration || ""}
            isShippedDifferent={saleDetails.is_shipped_different}
            shippedTo={{
              name: saleDetails.shipped_to_name || '',
              contact: saleDetails.shipped_to_contact || '',
              address: saleDetails.shipped_to_address || '',
              gstin: saleDetails.shipped_to_gstin || ''
            }}
          />
        );

        setTimeout(async () => {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          const pageElements = pdfContainer.querySelectorAll('#bill-pdf > div');

          for (let i = 0; i < pageElements.length; i++) {
            if (i > 0) {
              pdf.addPage();
            }

            const canvas = await html2canvas(pageElements[i], {
              scale: 1.5,
              useCORS: true,
              allowTaint: true,
              width: 794,
              height: 1123,
              backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
          }

          pdf.save(`Invoice_${saleDetails.bill_number}.pdf`);
          root.unmount();
          document.body.removeChild(pdfContainer);
          toast.success('PDF generated!');
        }, 1000);
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF');
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

    // New filters
    const matchPaymentStatus = !filters.paymentStatus ||
      (filters.paymentStatus === 'paid' && sale.is_paid === 1) ||
      (filters.paymentStatus === 'unpaid' && (sale.is_paid === 0 || !sale.is_paid));

    const matchApprovalStatus = !filters.approvalStatus ||
      (filters.approvalStatus === 'approved' && sale.is_approved === 1) ||
      (filters.approvalStatus === 'not_approved' && (sale.is_approved === 0 || !sale.is_approved));

    return matchStartDate && matchEndDate && matchCustomer && matchItem && matchSalesman && matchBill && matchPaymentStatus && matchApprovalStatus;
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

          {/* New Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filters.paymentStatus}
              onChange={e => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* New Approval Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
            <select
              value={filters.approvalStatus}
              onChange={e => setFilters({ ...filters, approvalStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="not_approved">Not Approved</option>
            </select>
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
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approve
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

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={sale.is_paid === 1}
                        onChange={(e) => handlePaidChange(sale.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      {sale.is_paid === 1 && sale.payment_method && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {sale.payment_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <input
                      type='checkbox'
                      checked={sale.is_approved === 1}
                      onChange={(e) => handleApproveChange(sale.id, e.target.checked)}
                    />
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

      {/* Enhanced Approve PIN Modal with Payment Verification */}
      {showApprovePinModal && approvalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approve Sale - Verify Payment Details</h2>

            {/* Sale Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Sale Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Bill Number:</strong> {approvalData.sale.bill_number}</div>
                <div><strong>Customer:</strong> {approvalData.sale.customer_name || 'Counter Sale'}</div>
                <div><strong>Total Amount:</strong> ₹{approvalData.sale.total_amount}</div>
                <div><strong>Payment Method:</strong> {approvalData.sale.payment_method?.toUpperCase()}</div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Amount Paid:</strong> ₹{approvalData.paymentDetails.amount}</div>
                <div><strong>Payment Date:</strong> {approvalData.paymentDetails.payment_date}</div>
                <div><strong>Status:</strong> {approvalData.paymentDetails.status}</div>
              </div>

              {/* Method-specific details */}
              {approvalData.sale.payment_method === 'upi' && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Transaction ID:</strong> {approvalData.paymentDetails.methodDetails.transaction_id || 'N/A'}</div>
                  <div><strong>UPI ID:</strong> {approvalData.paymentDetails.methodDetails.upi_id || 'N/A'}</div>
                  <div><strong>App Name:</strong> {approvalData.paymentDetails.methodDetails.app_name || 'N/A'}</div>
                  <div><strong>Reference:</strong> {approvalData.paymentDetails.methodDetails.reference_number || 'N/A'}</div>
                </div>
              )}

              {approvalData.sale.payment_method === 'cash' && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Received By:</strong> {approvalData.paymentDetails.methodDetails.received_by || 'N/A'}</div>
                  <div><strong>Receipt Number:</strong> {approvalData.paymentDetails.methodDetails.receipt_number || 'N/A'}</div>
                </div>
              )}

              {approvalData.sale.payment_method === 'neft_rtgs' && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Transaction Ref:</strong> {approvalData.paymentDetails.methodDetails.transaction_reference || 'N/A'}</div>
                  <div><strong>Transfer Type:</strong> {approvalData.paymentDetails.methodDetails.transfer_type?.toUpperCase() || 'N/A'}</div>
                  <div><strong>Sender Bank:</strong> {approvalData.paymentDetails.methodDetails.sender_bank || 'N/A'}</div>
                  <div><strong>Receiver Bank:</strong> {approvalData.paymentDetails.methodDetails.receiver_bank || 'N/A'}</div>
                </div>
              )}

              {approvalData.sale.payment_method === 'cheque' && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Cheque Number:</strong> {approvalData.paymentDetails.methodDetails.cheque_number || 'N/A'}</div>
                  <div><strong>Bank Name:</strong> {approvalData.paymentDetails.methodDetails.bank_name || 'N/A'}</div>
                  <div><strong>Cheque Date:</strong> {approvalData.paymentDetails.methodDetails.cheque_date || 'N/A'}</div>
                  <div><strong>Drawer Name:</strong> {approvalData.paymentDetails.methodDetails.drawer_name || 'N/A'}</div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter Approval PIN</label>
              <input
                type="password"
                value={approvePin}
                onChange={(e) => setApprovePin(e.target.value)}
                placeholder="Enter PIN to approve"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePinSubmit();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowApprovePinModal(false);
                  setApprovePin('');
                  setPendingApprovalSale(null);
                  setApprovalData(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePinSubmit}
              >
                Approve Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval History Modal */}
      {showApprovalHistoryModal && approvalHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approval History</h2>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <div><strong>Bill Number:</strong> {approvalHistory.billNumber}</div>
                <div><strong>Total Amount:</strong> ₹{approvalHistory.totalAmount}</div>
                <div><strong>Current Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${approvalHistory.currentStatus === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {approvalHistory.currentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowApprovalHistoryModal(false);
                  setApprovalHistory(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && paymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>

            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div><strong>Payment Method:</strong> {payment.payment_method?.toUpperCase()}</div>
                      <div><strong>Amount:</strong> ₹{payment.amount}</div>
                      <div><strong>Payment Date:</strong> {payment.payment_date}</div>
                      <div><strong>Status:</strong> {payment.status}</div>
                    </div>

                    {/* Method-specific details */}
                    {payment.payment_method === 'upi' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Transaction ID:</strong> {payment.details.transaction_id || 'N/A'}</div>
                        <div><strong>UPI ID:</strong> {payment.details.upi_id || 'N/A'}</div>
                        <div><strong>App Name:</strong> {payment.details.app_name || 'N/A'}</div>
                        <div><strong>Reference:</strong> {payment.details.reference_number || 'N/A'}</div>
                      </div>
                    )}

                    {payment.payment_method === 'cash' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Received By:</strong> {payment.details.received_by || 'N/A'}</div>
                        <div><strong>Receipt Number:</strong> {payment.details.receipt_number || 'N/A'}</div>
                      </div>
                    )}

                    {payment.payment_method === 'neft_rtgs' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Transaction Ref:</strong> {payment.details.transaction_reference || 'N/A'}</div>
                        <div><strong>Transfer Type:</strong> {payment.details.transfer_type?.toUpperCase() || 'N/A'}</div>
                        <div><strong>Sender Bank:</strong> {payment.details.sender_bank || 'N/A'}</div>
                        <div><strong>Receiver Bank:</strong> {payment.details.receiver_bank || 'N/A'}</div>
                      </div>
                    )}

                    {payment.payment_method === 'cheque' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Cheque Number:</strong> {payment.details.cheque_number || 'N/A'}</div>
                        <div><strong>Bank Name:</strong> {payment.details.bank_name || 'N/A'}</div>
                        <div><strong>Cheque Date:</strong> {payment.details.cheque_date || 'N/A'}</div>
                        <div><strong>Drawer Name:</strong> {payment.details.drawer_name || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No payment history found
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowPaymentHistoryModal(false);
                  setPaymentHistory(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h2>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({
                  ...paymentForm,
                  paymentMethod: e.target.value,
                  paymentDetails: {}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="neft_rtgs">NEFT/RTGS</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Method Specific Fields */}
            {paymentForm.paymentMethod === 'upi' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.transactionId || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, transactionId: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.upiId || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, upiId: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.appName || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, appName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.referenceNumber || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, referenceNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {paymentForm.paymentMethod === 'cash' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Received By</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.receivedBy || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, receivedBy: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.receiptNumber || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, receiptNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {paymentForm.paymentMethod === 'neft_rtgs' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.transactionReference || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, transactionReference: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
                  <select
                    value={paymentForm.paymentDetails.transferType || 'neft'}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, transferType: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="neft">NEFT</option>
                    <option value="rtgs">RTGS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender Bank</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.senderBank || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, senderBank: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receiver Bank</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.receiverBank || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, receiverBank: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {paymentForm.paymentMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.chequeNumber || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, chequeNumber: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.bankName || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, bankName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDetails.chequeDate || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, chequeDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Drawer Name</label>
                  <input
                    type="text"
                    value={paymentForm.paymentDetails.drawerName || ''}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      paymentDetails: { ...paymentForm.paymentDetails, drawerName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingPaymentSale(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handlePaymentSubmit}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesHistory;