import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, Calendar, DollarSign, FileText, Phone, MapPin } from 'lucide-react';

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaleDetails();
  }, [id]);

  const loadSaleDetails = async () => {
    try {

      const result = await window.electronAPI.getSaleDetails(parseInt(id));
      console.log('Sale details loaded:', result);
      setSale(result);
    } catch (error) {
      console.error('Error loading sale details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Sale not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/sales-history')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Sales
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Sale Details</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Sale ID</p>
              <p className="font-semibold">{sale.bill_number}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{new Date(sale.sale_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Salesman</p>
              <p className="font-semibold">{sale.salesman_name || sale.salesman || 'N/A'}</p>
            </div>
          </div>
          <div>
          </div>
          {/* Customer Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-base font-semibold text-blue-900">Customer Information</h2>
            </div>
            <div className="space-y-1 ml-7">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <span className="font-semibold ml-2">{sale.customer_name || 'Counter Sale'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact:</span>
                <span className="font-semibold ml-2">{sale.customer_contact || 'N/A'}</span>
              </div>
              {sale.customer_address && (
                <div>
                  <span className="text-sm text-gray-500">Address:</span>
                  <span className="font-semibold ml-2">{sale.customer_address}</span>
                </div>
              )}
              {sale.customer_gstin && (
                <div>
                  <span className="text-sm text-gray-500">GSTIN:</span>
                  <span className="font-semibold ml-2">{sale.customer_gstin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipped To Information */}
          {sale.is_shipped_different === 1 && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="w-5 h-5 text-green-600 mr-2" />
                <h2 className="text-base font-semibold text-green-900">Shipped To</h2>
              </div>
              <div className="space-y-1 ml-7">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <span className="font-semibold ml-2">{sale.shipped_to_name}</span>
                </div>
                {sale.shipped_to_contact && (
                  <div>
                    <span className="text-sm text-gray-500">Contact:</span>
                    <span className="font-semibold ml-2">{sale.shipped_to_contact}</span>
                  </div>
                )}
                {sale.shipped_to_address && (
                  <div>
                    <span className="text-sm text-gray-500">Address:</span>
                    <span className="font-semibold ml-2">{sale.shipped_to_address}</span>
                  </div>
                )}
                {sale.shipped_to_gstin && (
                  <div>
                    <span className="text-sm text-gray-500">GSTIN:</span>
                    <span className="font-semibold ml-2">{sale.shipped_to_gstin}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* here come the content */}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Items Sold
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">HSN Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rate</th>
                  {/* <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">CGST</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SGST</th> */}
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{item.item_name}</td>
                    <td className="px-4 py-2">{item.hsn_code || 'N/A'}</td>
                    <td className="px-4 py-2">{item.quantity} </td>
                    <td className="px-4 py-2">₹{item.unit_price}</td>
                    {/* <td className="px-4 py-2">₹{item.cgst_amount?.toFixed(2)}</td>
                    <td className="px-4 py-2">₹{item.sgst_amount?.toFixed(2)}</td> */}
                    <td className="px-4 py-2 font-semibold">₹{item.total_price?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <div className="flex justify-end space-y-2">
            <div className="text-right">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 mr-8">Subtotal:</span>
                <span className="font-semibold">₹ {sale.items?.reduce(
                  (sum, item) => sum + (item.total_price || 0),
                  0
                ).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 mr-8">Discount ({sale.discount}%):</span>
                <span className="font-semibold text-red-600">-₹{(
                  (sale.items?.reduce(
                    (sum, item) => sum + (item.total_price || 0),
                    0
                  ) || 0) * (sale.discount / 100)
                ).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 mr-8">Rounding Off:</span>
                <span className="font-semibold">
                  {sale.rounding_off > 0 ? '+' : '-'}₹{Math.abs(sale.rounding_off).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span className="mr-8">Final Amount:</span>
                <span className="text-green-600">₹{sale.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetails;