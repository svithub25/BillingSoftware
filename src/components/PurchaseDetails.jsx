import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar, DollarSign, FileText, Phone, MapPin, BadgePercent } from 'lucide-react';
import { toast } from 'react-toastify';

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = new URLSearchParams(location.search).get('edit') === '1';
  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [gst, setGst] = useState({ cgst_total: 0, sgst_total: 0, gst_total: 0 });
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    loadPurchaseDetails();
    // eslint-disable-next-line 
  }, [id]);

  useEffect(() => {
    if (isEdit && purchase && purchase.items) {
      setEditData({
        ...purchase,
        items: purchase.items.map(item => ({ ...item }))
      });
    }
  }, [isEdit, purchase]);

  const loadPurchaseDetails = async () => {
    try {
     
        const result = await window.electronAPI.getPurchaseDetails(parseInt(id));
        setPurchase(result.purchase);
        setItems(result.items);
        setGst(result.gst || { cgst_total: 0, sgst_total: 0, gst_total: 0 });
     
    } catch (error) {
      setPurchase(null);
      setItems([]);
      setGst({ cgst_total: 0, sgst_total: 0, gst_total: 0 });
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading purchase details...</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Purchase not found</div>
      </div>
    );
  }

  return (
    <div className="p-6"> 
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/purchase-history')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Purchases
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Purchase Details</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div> 
              <p className="text-sm text-gray-500">Purchase ID</p>
              <p className="font-semibold">#{purchase.id}</p>
            </div>
          </div>
          <div className="flex items-center"> 
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="font-semibold">{purchase.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="font-semibold">{purchase.supplier_name}</p>
              <p className="text-xs text-gray-500">{purchase.supplier_gstin && <>GSTIN: {purchase.supplier_gstin}</>}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-semibold">{purchase.supplier_contact || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-semibold">{purchase.supplier_address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{new Date(purchase.purchase_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-semibold text-green-600">₹{purchase.total_amount?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Items Purchased
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SKU</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">HSN Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rate</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Discount (%)</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Discounted Amount</th> {/* New column */}
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">GST %</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">CGST</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SGST</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
                  const discountedAmount = baseAmount - itemDiscount;
                  return (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{item.item_name}</td>
                      <td className="px-4 py-2">{item.sku || 'N/A'}</td>
                      <td className="px-4 py-2">{item.hsn_code || 'N/A'}</td>
                      <td className="px-4 py-2">{item.unit || 'N/A'}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">₹{item.unit_price}</td>
                      <td className="px-4 py-2">{item.discount ? `${item.discount}%` : '0%'}</td>
                      <td className="px-4 py-2 font-medium text-blue-700">₹{discountedAmount.toFixed(2)}</td> {/* New column */}
                      <td className="px-4 py-2">{item.gst_percentage}%</td>
                      <td className="px-4 py-2">₹{item.cgst_amount?.toFixed(2)}</td>
                      <td className="px-4 py-2">₹{item.sgst_amount?.toFixed(2)}</td>
                      <td className="px-4 py-2 font-semibold">
                      ₹{(discountedAmount + (item.cgst_amount || 0) + (item.sgst_amount || 0)).toFixed(2)}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-2 text-right" colSpan={7}>Totals:</td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => {
                      const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                      const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
                      return sum + (baseAmount - itemDiscount);
                    }, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-blue-700">
                    ₹{items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-green-700">
                    ₹{items.reduce((sum, item) => {
                      const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                      const itemDiscount = item.discount ? (baseAmount * item.discount) / 100 : 0;
                      const discountedAmount = baseAmount - itemDiscount;
                      return sum + discountedAmount + (item.cgst_amount || 0) + (item.sgst_amount || 0);
                    }, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="border-t pt-6 mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center">
            <BadgePercent className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Total CGST</p>
              <p className="font-semibold text-blue-700">₹{gst.cgst_total?.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <BadgePercent className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Total SGST</p>
              <p className="font-semibold text-blue-700">₹{gst.sgst_total?.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <BadgePercent className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Total GST</p>
              <p className="font-semibold text-blue-700">₹{gst.gst_total?.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <BadgePercent className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Rounding Off</p>
              <p className="font-semibold text-blue-700">
                {purchase.rounding_off > 0 ? '+' : '-'}₹{Math.abs(purchase.rounding_off || 0).toFixed(2)}
              </p>
            </div>
          </div>
          {/* <div className="flex items-center">
            <BadgePercent className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Overall Discount</p>
              <p className="font-semibold text-blue-700">{purchase.discount ? `${purchase.discount}%` : '0%'}</p>
            </div>
          </div> */}
        </div>

    
      </div>
    </div>
  );
};

export default PurchaseDetails;