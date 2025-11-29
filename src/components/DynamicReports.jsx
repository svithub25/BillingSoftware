import { useState, useEffect } from 'react';
import { FileDown, Filter, BarChart3, Search, X, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const DynamicReports = () => {
  const [activeTab, setActiveTab] = useState('predefined'); // 'predefined', 'complex', 'custom'
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState('');
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState({});
  const [reportData, setReportData] = useState([]);
  const [reportColumns, setReportColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Custom Report Builder State
  const [customConfig, setCustomConfig] = useState({
    source: 'sales', // sales, purchases, items
    dimensions: [],
    measures: [],
    filters: []
  });

  // Complex Report State
  const [complexReportType, setComplexReportType] = useState('');

  useEffect(() => {
    fetchReportTypes();
    fetchFilterOptions();
    fetchCompanyInfo();
  }, []);

  const fetchReportTypes = async () => {
    try {
      const types = await window.electronAPI.getReportTypes();
      setReportTypes(types);
    } catch (err) {
      console.error('Error fetching report types:', err);
      setError('Failed to load report types');
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const options = await window.electronAPI.getReportFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const result = await window.electronAPI.getCompanyInfo();
      if (result.success) {
        setCompanyInfo(result.data);
      }
    } catch (err) {
      console.error('Error fetching company info:', err);
    }
  };

  const selectedReport = reportTypes.find((r) => r.id === selectedReportType);

  const handleGenerateReport = async () => {
    if (activeTab === 'predefined' && !selectedReportType) {
      setError('Please select a report type');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPage(1); // Reset to first page

    try {
      let result;

      if (activeTab === 'predefined') {
        result = await window.electronAPI.generateDynamicReport({
          reportType: selectedReportType,
          filters: filters
        });
      } else if (activeTab === 'complex') {
        result = await window.electronAPI.generateComplexReport({
          reportType: complexReportType,
          filters: filters
        });
      } else if (activeTab === 'custom') {
        result = await window.electronAPI.generateCustomReport(customConfig);
      }

      setReportData(result.data || []);
      setReportColumns(result.columns || []);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleExportToExcel = async () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(selectedReport?.name || complexReportType || 'Custom Report');

    let currentRow = 1;

    // Add company header if company info is available
    if (companyInfo) {
      // Company Name
      const companyNameRow = worksheet.getRow(currentRow);
      companyNameRow.getCell(1).value = companyInfo.company_name;
      companyNameRow.getCell(1).font = { size: 16, bold: true };
      companyNameRow.getCell(1).alignment = { horizontal: 'center' };
      worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
      currentRow++;

      // Tagline
      if (companyInfo.tagline) {
        const taglineRow = worksheet.getRow(currentRow);
        taglineRow.getCell(1).value = companyInfo.tagline;
        taglineRow.getCell(1).font = { size: 10, italic: true };
        taglineRow.getCell(1).alignment = { horizontal: 'center' };
        worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
        currentRow++;
      }

      // Address
      const addressParts = [];
      if (companyInfo.address_line1) addressParts.push(companyInfo.address_line1);
      if (companyInfo.address_line2) addressParts.push(companyInfo.address_line2);
      if (companyInfo.city) addressParts.push(companyInfo.city);
      if (companyInfo.state) addressParts.push(companyInfo.state);
      if (companyInfo.pincode) addressParts.push(companyInfo.pincode);

      if (addressParts.length > 0) {
        const addressRow = worksheet.getRow(currentRow);
        addressRow.getCell(1).value = addressParts.join(', ');
        addressRow.getCell(1).font = { size: 9 };
        addressRow.getCell(1).alignment = { horizontal: 'center' };
        worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
        currentRow++;
      }

      // Contact details
      const contactParts = [];
      if (companyInfo.phone) contactParts.push(`Ph: ${companyInfo.phone}`);
      if (companyInfo.email) contactParts.push(`Email: ${companyInfo.email}`);
      if (companyInfo.gstin) contactParts.push(`GSTIN: ${companyInfo.gstin}`);

      if (contactParts.length > 0) {
        const contactRow = worksheet.getRow(currentRow);
        contactRow.getCell(1).value = contactParts.join(' | ');
        contactRow.getCell(1).font = { size: 9 };
        contactRow.getCell(1).alignment = { horizontal: 'center' };
        worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
        currentRow++;
      }

      // Empty row
      currentRow++;

      // Report title
      const reportTitleRow = worksheet.getRow(currentRow);
      reportTitleRow.getCell(1).value = selectedReport?.name || complexReportType || 'Custom Report';
      reportTitleRow.getCell(1).font = { size: 14, bold: true };
      reportTitleRow.getCell(1).alignment = { horizontal: 'center' };
      worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
      currentRow++;

      // Report filters (if any)
      if (Object.keys(filters).length > 0) {
        const filterText = Object.entries(filters)
          .filter(([, value]) => value)
          .map(([key, value]) => {
            if (key === 'dateFrom' && filters.dateTo) {
              return `Period: ${value} to ${filters.dateTo}`;
            }
            if (key === 'dateTo') return null;
            return `${key}: ${value}`;
          })
          .filter(Boolean)
          .join(' | ');

        if (filterText) {
          const filterRow = worksheet.getRow(currentRow);
          filterRow.getCell(1).value = filterText;
          filterRow.getCell(1).font = { size: 9, italic: true };
          filterRow.getCell(1).alignment = { horizontal: 'center' };
          worksheet.mergeCells(currentRow, 1, currentRow, reportColumns.length);
          currentRow++;
        }
      }

      // Empty row before table
      currentRow++;
    }

    // Add headers
    const headerRow = worksheet.getRow(currentRow);
    reportColumns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;

    // Add data rows
    reportData.forEach((row) => {
      const dataRow = worksheet.getRow(currentRow);
      reportColumns.forEach((col, index) => {
        const cell = dataRow.getCell(index + 1);
        let value = row[col.key];

        // Format based on column format
        if (col.format === 'currency' && typeof value === 'number') {
          cell.value = value;
          cell.numFmt = '₹#,##0.00';
        } else if (col.format === 'number' && typeof value === 'number') {
          cell.value = value;
          cell.numFmt = '#,##0.00';
        } else if (col.format === 'percentage' && typeof value === 'number') {
          cell.value = value / 100;
          cell.numFmt = '0.00%';
        } else if (col.format === 'date' && value) {
          cell.value = value;
        } else if (col.format === 'paymentStatus') {
          cell.value = value === 1 ? 'Paid' : 'Unpaid';
        } else if (col.format === 'boolean') {
          cell.value = value === 1 ? 'Yes' : 'No';
        } else {
          cell.value = value;
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      currentRow++;
    });

    // Set column widths
    reportColumns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width || 15;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fileName = `${selectedReport?.name || complexReportType || 'Custom_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  };

  const formatCellValue = (value, format) => {
    if (value === null || value === undefined) return '-';

    switch (format) {
      case 'currency':
        return typeof value === 'number' ? `₹${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : value;
      case 'number':
        return typeof value === 'number' ? value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : value;
      case 'percentage':
        return typeof value === 'number' ? `${value}%` : value;
      case 'date':
        return value ? new Date(value).toLocaleDateString('en-IN') : '-';
      case 'paymentStatus':
        return value === 1 ? 'Paid' : 'Unpaid';
      case 'boolean':
        return value === 1 ? 'Yes' : 'No';
      default:
        return value;
    }
  };

  const renderFilter = (filterType) => {
    switch (filterType) {
      case 'dateRange':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        );

      case 'customer':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.customer || ''}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
            >
              <option value="">All Customers</option>
              {filterOptions.customers?.map((customer) => (
                <option key={customer.name} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'supplier':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.supplier || ''}
              onChange={(e) => handleFilterChange('supplier', e.target.value)}
            >
              <option value="">All Suppliers</option>
              {filterOptions.suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'category':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {filterOptions.categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'salesman':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salesman</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.salesman || ''}
              onChange={(e) => handleFilterChange('salesman', e.target.value)}
            >
              <option value="">All Salesmen</option>
              {filterOptions.salesmen?.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'item':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.item || ''}
              onChange={(e) => handleFilterChange('item', e.target.value)}
            >
              <option value="">All Items</option>
              {filterOptions.items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.sku ? `(${item.sku})` : ''}
                </option>
              ))}
            </select>
          </div>
        );

      case 'paymentStatus':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.paymentStatus || ''}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        );

      case 'lowStock':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lowStock"
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              checked={filters.lowStock || false}
              onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
            />
            <label htmlFor="lowStock" className="text-sm font-medium text-gray-700">
              Show only low stock items
            </label>
          </div>
        );

      case 'noteType':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.noteType || ''}
              onChange={(e) => handleFilterChange('noteType', e.target.value)}
            >
              <option value="">All</option>
              <option value="credit">Credit Note</option>
              <option value="debit">Debit Note</option>
            </select>
          </div>
        );

      case 'paymentMethod':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.paymentMethod || ''}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="neft_rtgs">NEFT/RTGS</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        );

      case 'ageingDays':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Days Outstanding
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.ageingDays || ''}
              onChange={(e) => handleFilterChange('ageingDays', e.target.value)}
              placeholder="e.g., 30"
            />
          </div>
        );

      case 'party':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.party || ''}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              placeholder="Search party name..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Group report types by category
  const groupedReportTypes = reportTypes.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {});

  // Pagination calculations
  const totalPages = Math.ceil(reportData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = reportData.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Complex Reports Configuration
  const complexReports = [
    {
      id: 'salesman-area-item',
      name: 'Salesman-wise Area-wise Item Report',
      description: 'Sales breakdown by salesman, working area, and items sold'
    },
    {
      id: 'customer-category-time',
      name: 'Customer-wise Category-wise Time Analysis',
      description: 'Customer purchases by category over time periods'
    },
    {
      id: 'supplier-item-payment',
      name: 'Supplier-wise Item-wise Payment Analysis',
      description: 'Purchases grouped by supplier, item, and payment status'
    },
    {
      id: 'salesman-customer-category',
      name: 'Salesman-Customer-Category Matrix',
      description: 'Three-dimensional analysis of sales by salesman, customer, and category'
    }
  ];

  // Available dimensions for custom reports
  const availableDimensions = {
    sales: [
      { id: 'customer_name', label: 'Customer Name', table: 'sales' },
      { id: 'salesman_id', label: 'Salesman', table: 'salesman', join: true },
      { id: 'category_id', label: 'Category', table: 'categories', join: true },
      { id: 'item_id', label: 'Item', table: 'items', join: true },
      { id: 'sale_date', label: 'Sale Date', table: 'sales' },
      { id: 'payment_method', label: 'Payment Method', table: 'sales' },
      { id: 'is_paid', label: 'Payment Status', table: 'sales' }
    ],
    purchases: [
      { id: 'supplier_id', label: 'Supplier', table: 'suppliers', join: true },
      { id: 'category_id', label: 'Category', table: 'categories', join: true },
      { id: 'item_id', label: 'Item', table: 'items', join: true },
      { id: 'purchase_date', label: 'Purchase Date', table: 'purchases' },
      { id: 'payment_method', label: 'Payment Method', table: 'purchases' },
      { id: 'is_paid', label: 'Payment Status', table: 'purchases' }
    ],
    items: [
      { id: 'category_id', label: 'Category', table: 'categories', join: true },
      { id: 'unit', label: 'Unit', table: 'items' }
    ]
  };

  const availableMeasures = [
    { id: 'count', label: 'Count of Records', aggregation: 'COUNT(*)' },
    { id: 'total_amount', label: 'Total Amount', aggregation: 'SUM(total_amount)' },
    { id: 'avg_amount', label: 'Average Amount', aggregation: 'AVG(total_amount)' },
    { id: 'total_quantity', label: 'Total Quantity', aggregation: 'SUM(quantity)' },
    { id: 'avg_quantity', label: 'Average Quantity', aggregation: 'AVG(quantity)' }
  ];

  const renderCustomReportBuilder = () => (
    <div className="space-y-6">
      {/* Data Source Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={customConfig.source}
          onChange={(e) => setCustomConfig({ ...customConfig, source: e.target.value, dimensions: [], measures: [] })}
        >
          <option value="sales">Sales</option>
          <option value="purchases">Purchases</option>
          <option value="items">Items</option>
        </select>
      </div>

      {/* Dimensions Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dimensions (Group By) - Select fields to group data
        </label>
        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
          {customConfig.dimensions.length === 0 && (
            <p className="text-sm text-gray-500 mb-2">No dimensions selected. Click below to add.</p>
          )}
          {customConfig.dimensions.map((dim, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                value={dim}
                onChange={(e) => {
                  const newDims = [...customConfig.dimensions];
                  newDims[index] = e.target.value;
                  setCustomConfig({ ...customConfig, dimensions: newDims });
                }}
              >
                <option value="">Select Dimension</option>
                {availableDimensions[customConfig.source]?.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newDims = customConfig.dimensions.filter((_, i) => i !== index);
                  setCustomConfig({ ...customConfig, dimensions: newDims });
                }}
                className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCustomConfig({ ...customConfig, dimensions: [...customConfig.dimensions, ''] })}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dimension</span>
          </button>
        </div>
      </div>

      {/* Measures Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Measures (What to Calculate)
        </label>
        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
          {customConfig.measures.length === 0 && (
            <p className="text-sm text-gray-500 mb-2">No measures selected. Click below to add.</p>
          )}
          {customConfig.measures.map((measure, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                value={measure}
                onChange={(e) => {
                  const newMeasures = [...customConfig.measures];
                  newMeasures[index] = e.target.value;
                  setCustomConfig({ ...customConfig, measures: newMeasures });
                }}
              >
                <option value="">Select Measure</option>
                {availableMeasures.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newMeasures = customConfig.measures.filter((_, i) => i !== index);
                  setCustomConfig({ ...customConfig, measures: newMeasures });
                }}
                className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCustomConfig({ ...customConfig, measures: [...customConfig.measures, ''] })}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Measure</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dynamic Reports</h1>
              <p className="text-sm text-gray-600">Generate customizable reports with advanced filters</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('predefined');
                setReportData([]);
                setReportColumns([]);
                setFilters({});
              }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'predefined'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Predefined Reports
            </button>
            <button
              onClick={() => {
                setActiveTab('complex');
                setReportData([]);
                setReportColumns([]);
                setFilters({});
              }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'complex'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Complex Reports
            </button>
            <button
              onClick={() => {
                setActiveTab('custom');
                setReportData([]);
                setReportColumns([]);
                setFilters({});
              }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'custom'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Custom Report Builder
            </button>
          </div>
        </div>

        {/* Predefined Reports Tab */}
        {activeTab === 'predefined' && (
          <>
            {/* Report Selection with Fixed Height */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-64 overflow-y-auto"
                value={selectedReportType}
                onChange={(e) => {
                  setSelectedReportType(e.target.value);
                  setFilters({});
                  setReportData([]);
                  setReportColumns([]);
                }}
                size="1"
              >
                <option value="">-- Select a Report --</option>
                {Object.entries(groupedReportTypes).map(([category, reports]) => (
                  <optgroup key={category} label={category}>
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Filters Section */}
            {selectedReport && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  </div>
                  {Object.keys(filters).length > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm">Clear Filters</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {selectedReport.filters.map((filterType) => (
                    <div key={filterType}>{renderFilter(filterType)}</div>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
                  </button>

                  {reportData.length > 0 && (
                    <button
                      onClick={handleExportToExcel}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export to Excel</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Complex Reports Tab */}
        {activeTab === 'complex' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Complex Report</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {complexReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setComplexReportType(report.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    complexReportType === report.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              ))}
            </div>

            {complexReportType && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {renderFilter('dateRange')}
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
                  </button>

                  {reportData.length > 0 && (
                    <button
                      onClick={handleExportToExcel}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export to Excel</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Report Builder Tab */}
        {activeTab === 'custom' && (
          <div className="mb-6">
            {renderCustomReportBuilder()}

            <div className="mt-6 flex items-center space-x-4">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading || customConfig.dimensions.length === 0 || customConfig.measures.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Generating...' : 'Generate Custom Report'}</span>
              </button>

              {reportData.length > 0 && (
                <button
                  onClick={handleExportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export to Excel</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Results Table with Pagination */}
        {reportData.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedReport?.name || complexReportType || 'Custom Report'} ({reportData.length} records)
              </h2>

              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={reportData.length}>All</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600">
                    {reportColumns.map((col, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-sm font-semibold text-white border border-gray-300"
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      {reportColumns.map((col, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-4 py-2 text-sm text-gray-700 border border-gray-300"
                        >
                          {formatCellValue(row[col.key], col.format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, reportData.length)} of {reportData.length} entries
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {!isLoading && reportData.length === 0 && (selectedReportType || complexReportType || (activeTab === 'custom' && customConfig.dimensions.length > 0)) && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No data found. Try adjusting your filters or generate the report.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!selectedReportType && !complexReportType && activeTab === 'predefined' && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a report type to get started</p>
          </div>
        )}

        {!complexReportType && activeTab === 'complex' && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a complex report to get started</p>
          </div>
        )}

        {activeTab === 'custom' && customConfig.dimensions.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Configure your custom report by selecting dimensions and measures</p>
          </div>
        )}
      </div>  
    </div>
  );
};

export default DynamicReports;
