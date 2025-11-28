import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  DollarSign,
  FileText,
  Phone,
  MapPin,
  BadgePercent,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const CreditDebitNoteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNoteDetails();
    // eslint-disable-next-line
  }, [id]);

  const loadNoteDetails = async () => {
    try {
      const notesData = await window.electronAPI.getCreditDebitNotes({
        type: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
      });

      const foundNote = notesData.find(n => n.id === parseInt(id));

      if (foundNote) {
        setNote(foundNote);
        setItems(foundNote.items || []);
      } else {
        setNote(null);
        setItems([]);
        toast.error('Note not found');
      }
    } catch (error) {
      console.error('Error loading note details:', error);
      setNote(null);
      setItems([]);
      toast.error('Error loading note details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading note details...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Credit/Debit Note not found</div>
      </div>
    );
  }

  const isCredit = note.note_type === 'credit';

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
        <h1 className="text-2xl font-bold text-gray-800">
          {isCredit ? 'Credit' : 'Debit'} Note Details
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Note Type Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isCredit ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {note.note_type.toUpperCase()} NOTE
          </span>
        </div>

        {/* Note Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Note Number</p>
              <p className="font-semibold">{note.note_number}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Note Date</p>
              <p className="font-semibold">{new Date(note.note_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Original Invoice</p>
              <p className="font-semibold">{note.original_invoice_number || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Reference Type</p>
              <p className="font-semibold capitalize">{note.reference_type}</p>
            </div>
          </div>
        </div>

        {/* Party Information */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Party Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-500 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Party Name</p>
                <p className="font-semibold">{note.party_name}</p>
                {note.party_gstin && (
                  <p className="text-xs text-gray-500">GSTIN: {note.party_gstin}</p>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-gray-500 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold">{note.party_contact || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold">{note.party_address || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">State / City</p>
                <p className="font-semibold">
                  {note.party_state || 'N/A'} / {note.party_city || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-t pt-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Items
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">HSN Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Original Qty</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Return Qty</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit Price</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Discount (%)</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Taxable</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">GST %</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">CGST</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SGST</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{item.item_name}</td>
                    <td className="px-4 py-2">{item.hsn_code || 'N/A'}</td>
                    <td className="px-4 py-2">{item.original_quantity}</td>
                    <td className="px-4 py-2 font-medium text-blue-700">{item.return_quantity}</td>
                    <td className="px-4 py-2">₹{item.unit_price}</td>
                    <td className="px-4 py-2">{item.discount ? `${item.discount}%` : '0%'}</td>
                    <td className="px-4 py-2 font-medium text-blue-700">₹{item.taxable_amount?.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.gst_percentage}%</td>
                    <td className="px-4 py-2">₹{item.cgst_amount?.toFixed(2)}</td>
                    <td className="px-4 py-2">₹{item.sgst_amount?.toFixed(2)}</td>
                    <td className="px-4 py-2 font-semibold">₹{item.total_amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-2 text-right" colSpan={6}>Totals:</td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => sum + (item.taxable_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-green-700">
                    ₹{items.reduce((sum, item) => sum + (item.total_amount || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-t pt-6 mb-6">
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Financial Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{note.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CGST</span>
                  <span className="text-sm font-semibold text-gray-900">₹{note.cgst_total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SGST</span>
                  <span className="text-sm font-semibold text-gray-900">₹{note.sgst_total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rounding Off</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {note.rounding_off > 0 ? '+' : ''}₹{note.rounding_off?.toFixed(2)}
                  </span>
                </div>
                {note.other_charges > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Other Charges</span>
                    <span className="text-sm font-semibold text-gray-900">₹{note.other_charges?.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-green-700">₹{note.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settlement & Approval Info */}
        {(note.is_settled === 1 || note.is_approved === 1 || note.reason) && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {note.reason && (
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-gray-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="font-semibold">{note.reason}</p>
                  </div>
                </div>
              )}
              {note.is_settled === 1 && (
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Settlement Status</p>
                    <p className="font-semibold text-green-700">Settled</p>
                    {note.settlement_method && (
                      <p className="text-xs text-gray-500">Method: {note.settlement_method}</p>
                    )}
                    {note.settlement_date && (
                      <p className="text-xs text-gray-500">
                        Date: {new Date(note.settlement_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {note.is_approved === 1 && (
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Approval Status</p>
                    <p className="font-semibold text-green-700">Approved</p>
                    {note.approved_by && (
                      <p className="text-xs text-gray-500">By: {note.approved_by}</p>
                    )}
                    {note.approved_at && (
                      <p className="text-xs text-gray-500">
                        At: {new Date(note.approved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {note.remarks && (
                <div className="flex items-start md:col-span-2">
                  <FileText className="w-5 h-5 text-gray-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Remarks</p>
                    <p className="font-semibold">{note.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditDebitNoteDetails;
