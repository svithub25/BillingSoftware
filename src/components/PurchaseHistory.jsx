import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  RefreshCw,
  Eye,
  Edit3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import PurchasePDF from './PurchasePDF';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const defaultPaymentForm = () => ({
  paymentMethod: 'cash',
  amount: 0,
  paymentDate: new Date().toISOString().split('T')[0],
  paymentDetails: {}
});

const PurchaseHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({
    supplier: '',
    invoice: '',
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [showPurchasePaymentModal, setShowPurchasePaymentModal] = useState(false);
  const [showPurchasePaymentHistoryModal, setShowPurchasePaymentHistoryModal] = useState(false);
  const [pendingPurchasePayment, setPendingPurchasePayment] = useState(null);
  const [purchasePaymentHistory, setPurchasePaymentHistory] = useState(null);
  const [purchasePaymentForm, setPurchasePaymentForm] = useState(defaultPaymentForm);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadPurchaseHistory();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [historyFilters]);

  const loadPurchaseHistory = async () => {
    setLoading(true);
    try {
      const historyData = await window.electronAPI.getPurchaseHistory();
      setPurchaseHistory(historyData);
    } catch (error) {
      console.error('Error loading purchase history:', error);
      toast.error('Error loading purchase history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return purchaseHistory
      .filter(purchase => {
        const supplierMatch = historyFilters.supplier
          ? purchase.supplier_name?.toLowerCase().includes(historyFilters.supplier.toLowerCase())
          : true;
        const invoiceMatch = historyFilters.invoice
          ? purchase.invoice_number?.toLowerCase().includes(historyFilters.invoice.toLowerCase())
          : true;
        const dateMatch = historyFilters.date
          ? new Date(purchase.purchase_date).toLocaleDateString() ===
            new Date(historyFilters.date).toLocaleDateString()
          : true;
        return supplierMatch && invoiceMatch && dateMatch;
      })
      .sort((a, b) => b.id - a.id);
  }, [purchaseHistory, historyFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentPurchases = filteredHistory.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  const handlePurchasePaidChange = async (purchaseId, isPaid) => {
    if (isPaid) {
      const purchase = purchaseHistory.find(p => p.id === purchaseId);
      if (!purchase) {
        toast.error('Purchase not found');
        return;
      }
      setPendingPurchasePayment(purchase);
      setPurchasePaymentForm({
        ...defaultPaymentForm(),
        amount: purchase.total_amount
      });
      setShowPurchasePaymentModal(true);
    } else {
      try {
        const history = await window.electronAPI.getPurchasePaymentDetails(purchaseId);
        setPurchasePaymentHistory(history);
        setShowPurchasePaymentHistoryModal(true);
      } catch (error) {
        toast.error('Error loading payment history');
      }
    }
  };

  const handlePurchasePaymentSubmit = async () => {
    if (!pendingPurchasePayment) return;
    try {
      const result = await window.electronAPI.savePurchasePayment({
        purchaseId: pendingPurchasePayment.id,
        paymentMethod: purchasePaymentForm.paymentMethod,
        amount: purchasePaymentForm.amount,
        paymentDate: purchasePaymentForm.paymentDate,
        paymentDetails: purchasePaymentForm.paymentDetails
      });

      if (result.success) {
        setPurchaseHistory(prev =>
          prev.map(purchase =>
            purchase.id === pendingPurchasePayment.id
              ? { ...purchase, is_paid: 1, payment_method: purchasePaymentForm.paymentMethod }
              : purchase
          )
        );
        setShowPurchasePaymentModal(false);
        setPendingPurchasePayment(null);
        setPurchasePaymentForm(defaultPaymentForm());
        toast.success('Payment recorded successfully');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Error recording payment');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    try {
      const check = await window.electronAPI.checkPurchaseDeleteStock(purchaseId);
      if (!check.ok) {
        toast.error(check.message || 'Cannot delete purchase: Inventory impact detected');
        return;
      }
      await window.electronAPI.deletePurchase(purchaseId);
      toast.success('Purchase deleted!');
      setConfirmDeleteOpen(false);
      await loadPurchaseHistory();
    } catch (error) {
      console.error(error);
      toast.error('Error deleting purchase');
    }
  };

  const handleReprintPurchase = async (purchaseId) => {
    try {
      const purchaseDetails = await window.electronAPI.getPurchaseDetails(purchaseId);

      const supplier = {
        name: purchaseDetails.purchase.supplier_name || '',
        address: purchaseDetails.purchase.supplier_address || '',
        gstin: purchaseDetails.purchase.supplier_gstin || '',
        contact: purchaseDetails.purchase.supplier_contact || ''
      };

      const items = (purchaseDetails.items || []).map(item => ({
        hsn_code: item.hsn_code || '',
        sku: item.sku || '',
        name: item.item_name || '',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        gst_percentage: item.gst_percentage || 0,
        total_price: item.total_price || 0
      }));

      const purchaseNumber = purchaseDetails.purchase.id || '';
      const invoiceNumber = purchaseDetails.purchase.invoice_number || '';
      const purchaseDate = purchaseDetails.purchase.purchase_date
        ? new Date(purchaseDetails.purchase.purchase_date).toLocaleDateString()
        : '';
      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '210mm';
      pdfContainer.style.zIndex = '-1';
      document.body.appendChild(pdfContainer);

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(pdfContainer);
      root.render(
        <PurchasePDF
          purchaseNumber={purchaseNumber}
          invoiceNumber={invoiceNumber}
          purchaseDate={purchaseDate}
          supplier={supplier}
          items={items}
          discount={purchaseDetails.purchase.discount || 0}
          subtotal={subtotal}
          roundingOff={purchaseDetails.purchase.rounding_off || 0}
          total={purchaseDetails.purchase.total_amount || subtotal}
        />
      );

      setTimeout(async () => {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageElements = pdfContainer.querySelectorAll('#purchase-pdf > div');

        for (let i = 0; i < pageElements.length; i += 1) {
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

        pdf.save(`Purchase_${invoiceNumber || purchaseNumber || purchaseId}.pdf`);
        root.unmount();
        document.body.removeChild(pdfContainer);
        toast.success('PDF generated!');
      }, 1000);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Error generating PDF');
    }
  };

  const renderPaymentMethodFields = () => {
    const updateDetails = (updates) => {
      setPurchasePaymentForm(prev => ({
        ...prev,
        paymentDetails: { ...prev.paymentDetails, ...updates }
      }));
    };

    switch (purchasePaymentForm.paymentMethod) {
      case 'upi':
        return (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.transactionId || ''}
                onChange={(e) => updateDetails({ transactionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.upiId || ''}
                onChange={(e) => updateDetails({ upiId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.appName || ''}
                onChange={(e) => updateDetails({ appName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.referenceNumber || ''}
                onChange={(e) => updateDetails({ referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      case 'cash':
        return (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.receivedBy || ''}
                onChange={(e) => updateDetails({ receivedBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.receiptNumber || ''}
                onChange={(e) => updateDetails({ receiptNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      case 'neft_rtgs':
        return (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.transactionReference || ''}
                onChange={(e) => updateDetails({ transactionReference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
              <select
                value={purchasePaymentForm.paymentDetails.transferType || 'neft'}
                onChange={(e) => updateDetails({ transferType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="neft">NEFT</option>
                <option value="rtgs">RTGS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Our Bank</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.senderBank || ''}
                onChange={(e) => updateDetails({ senderBank: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Bank</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.receiverBank || ''}
                onChange={(e) => updateDetails({ receiverBank: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      case 'cheque':
        return (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.chequeNumber || ''}
                onChange={(e) => updateDetails({ chequeNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.bankName || ''}
                onChange={(e) => updateDetails({ bankName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Date</label>
              <input
                type="date"
                value={purchasePaymentForm.paymentDetails.chequeDate || ''}
                onChange={(e) => updateDetails({ chequeDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issued By</label>
              <input
                type="text"
                value={purchasePaymentForm.paymentDetails.drawerName || ''}
                onChange={(e) => updateDetails({ drawerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
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

  const selectedPurchase = purchaseHistory.find(p => p.id === deleteId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase History</h1>
          <p className="text-gray-600">Review recorded purchases, payments, and invoices</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            value={historyFilters.supplier}
            onChange={e => setHistoryFilters(f => ({ ...f, supplier: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Filter by supplier"
          />
          <input
            type="text"
            value={historyFilters.invoice}
            onChange={e => setHistoryFilters(f => ({ ...f, invoice: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Filter by invoice"
          />
          <input
            type="date"
            value={historyFilters.date}
            onChange={e => setHistoryFilters(f => ({ ...f, date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Filter by date"
          />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredHistory.length ? `${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredHistory.length)}` : 0} of {filteredHistory.length} purchases
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{purchase.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(purchase.purchase_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.supplier_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{purchase.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={purchase.is_paid === 1}
                        onChange={(e) => handlePurchasePaidChange(purchase.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      {purchase.is_paid === 1 && purchase.payment_method && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {purchase.payment_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/purchase/${purchase.id}`)}
                      title="View Purchase Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => navigate(`/purchaseupdate/${purchase.id}`)}
                      title="Edit Purchase"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="text-black-600 hover:text-black-900"
                      onClick={() => {
                        setDeleteId(purchase.id);
                        setConfirmDeleteOpen(true);
                      }}
                      title="Delete Purchase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReprintPurchase(purchase.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Reprint Purchase"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentPurchases.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No purchase records found</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between mt-4">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-2 rounded-lg mr-2 ${
                  currentPage === 1
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
                      onClick={() => setCurrentPage(1)}
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
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === pageNum
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
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center px-3 py-2 rounded-lg ml-2 ${
                  currentPage === totalPages
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

      {confirmDeleteOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Purchase</h2>
            <p className="mb-2">
              Are you sure you want to delete this purchase?
              <br />
              <span className="text-sm text-gray-700">
                <strong>Purchase No:</strong> {selectedPurchase.id}<br />
                <strong>Invoice:</strong> {selectedPurchase.invoice_number || 'N/A'}<br />
                <strong>Supplier:</strong> {selectedPurchase.supplier_name || 'N/A'}
              </span>
            </p>
            <p className="mb-6 text-xs text-gray-500">
              This will revert inventory for all items in this purchase.
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
                onClick={() => handleDeletePurchase(selectedPurchase.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchasePaymentModal && pendingPurchasePayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Purchase Payment</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={purchasePaymentForm.paymentMethod}
                onChange={(e) =>
                  setPurchasePaymentForm({
                    ...purchasePaymentForm,
                    paymentMethod: e.target.value,
                    paymentDetails: {}
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="neft_rtgs">NEFT/RTGS</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={purchasePaymentForm.amount}
                  onChange={(e) =>
                    setPurchasePaymentForm({
                      ...purchasePaymentForm,
                      amount: parseFloat(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={purchasePaymentForm.paymentDate}
                  onChange={(e) =>
                    setPurchasePaymentForm({
                      ...purchasePaymentForm,
                      paymentDate: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {renderPaymentMethodFields()}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => {
                  setShowPurchasePaymentModal(false);
                  setPendingPurchasePayment(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handlePurchasePaymentSubmit}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchasePaymentHistoryModal && purchasePaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Payment History</h2>

            {purchasePaymentHistory.length > 0 ? (
              <div className="space-y-4">
                {purchasePaymentHistory.map((payment, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div><strong>Payment Method:</strong> {payment.payment_method?.toUpperCase()}</div>
                      <div><strong>Amount:</strong> ₹{payment.amount}</div>
                      <div><strong>Payment Date:</strong> {payment.payment_date}</div>
                      <div><strong>Status:</strong> {payment.status}</div>
                    </div>

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
                        <div><strong>Paid By:</strong> {payment.details.received_by || 'N/A'}</div>
                        <div><strong>Receipt Number:</strong> {payment.details.receipt_number || 'N/A'}</div>
                      </div>
                    )}

                    {payment.payment_method === 'neft_rtgs' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Transaction Ref:</strong> {payment.details.transaction_reference || 'N/A'}</div>
                        <div><strong>Transfer Type:</strong> {payment.details.transfer_type?.toUpperCase() || 'N/A'}</div>
                        <div><strong>Our Bank:</strong> {payment.details.sender_bank || 'N/A'}</div>
                        <div><strong>Supplier Bank:</strong> {payment.details.receiver_bank || 'N/A'}</div>
                      </div>
                    )}

                    {payment.payment_method === 'cheque' && payment.details && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                        <div><strong>Cheque Number:</strong> {payment.details.cheque_number || 'N/A'}</div>
                        <div><strong>Bank Name:</strong> {payment.details.bank_name || 'N/A'}</div>
                        <div><strong>Cheque Date:</strong> {payment.details.cheque_date || 'N/A'}</div>
                        <div><strong>Issued By:</strong> {payment.details.drawer_name || 'N/A'}</div>
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
                  setShowPurchasePaymentHistoryModal(false);
                  setPurchasePaymentHistory(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;

