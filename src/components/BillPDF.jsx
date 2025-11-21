import React, { useState, useEffect } from "react";
import companyLogo from "../Assets/logo.png";
import { Building2 } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

function BillPDF({ 
  billNumber, 
  customer, 
  items, 
  discount = 0, 
  subtotal = 0, 
  roundingOff = 0, 
  total = 0, 
  sale_type = "", 
  salesman_name = "", 
  salesman_contact = "", 
  salesman_address = "", 
  note = "",
  isShippedDifferent = false,
  shippedTo = { name: '', contact: '', address: '', gstin: '' }
}) {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const result = await window.electronAPI.getCompanyInfo();
      console.log('Company Info Result:', result);
      if (result.success && result.data) {
        setCompanyInfo(result.data);
        
        // Load logo if exists
        if (result.data.logo_path) {
          const logoResult = await window.electronAPI.getLogoAsBase64(result.data.logo_path);
          if (logoResult.success) {
            setLogoDataUrl(logoResult.dataUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  console.log(salesman_contact);
  
  // Split items into pages
  const pages = []; 
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

 const Header = () => (
  <div className="border-b border-[hsl(0,0%,0%)] pb-2 mb-2">
    <div className="flex justify-center">
      <h2 className="text-xl font-bold text-[hsl(0,0%,0%)]">INVOICE</h2>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3">
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt="Company Logo"
            className="w-20 h-20 object-contain"
          />
        ) : (
          <div className="w-20 h-20 flex items-center justify-center border border-gray-300">
            <Building2 className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
      <div className="text-left ml-6 flex-[2] space-y-0.5">
        <h2 className="text-xl font-bold text-[hsl(0,0%,0%)]">
          {companyInfo?.company_name || 'Company Name'}
        </h2>
        <div className="text-[11px] text-[hsl(0,0%,0%)] space-y-0.5 mt-0.5">
          {companyInfo?.address_line1 && <p>{companyInfo.address_line1}</p>}
          {companyInfo?.address_line2 && <p>{companyInfo.address_line2}</p>}
          {(companyInfo?.city || companyInfo?.state || companyInfo?.pincode) && (
            <p>
              {[companyInfo?.city, companyInfo?.state, companyInfo?.pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {(companyInfo?.phone || companyInfo?.mobile) && (
            <span>Contact: {companyInfo?.phone || companyInfo?.mobile}</span>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[hsl(0,0%,0%)] mt-1">
            {companyInfo?.email && <span>Email: {companyInfo.email}</span>}
            {companyInfo?.email && companyInfo.website && <span>|</span>}
            {companyInfo?.website && <span>Website: {companyInfo.website}</span>}
          </div>
        </div>
      </div>
      <div className="text-right ml-0 flex-1 min-w-[140px]">
        <h3 className="text-xs font-semibold text-[hsl(0,0%,0%)] uppercase tracking-wider mb-1">
          Bill Details
        </h3>
        <div className="space-y-0.5 text-xs">
          <div className="text-right">
            <span className="font-medium text-[hsl(0,0%,0%)]">{billNumber}</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-[hsl(0,0%,0%)]">
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

  // Determine what to show based on sale_type
  const getBilledToInfo = () => {
    if (sale_type === "customer") {
      return {
        name: customer.name,
        address: customer.address || "",
        contact: customer.contact || "",
        gstin: customer.gstin || ""
      };
    } else if (sale_type === "salesman") {
      return {
        name: salesman_name,
        address: salesman_address,
        contact: salesman_contact,
        gstin: ""
      };
    } else if (sale_type === "others") {
      return {
        name: customer.name || "",
        address: customer.address || "",
        contact: customer.contact || "",
        gstin: customer.gstin || ""
      };
    }
    return { name: "", address: "", contact: "", gstin: "" };
  };

  const billedTo = getBilledToInfo();
  // const showSalesmanDetails = sale_type === "customer";


  const BillDetails = () => (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[hsl(0,0%,0%)] uppercase tracking-wider mb-1">
          Billed To
        </h3>
        <div className="bg-[hsl(0,0%,100%)] border border-[hsl(0,0%,0%)] p-1 rounded-lg space-y-0.5">
          <p className="font-semibold text-[hsl(0,0%,0%)] text-[13px]">{billedTo.name}</p>
          {billedTo.address && (
            <p className="text-[11px] text-[hsl(0,0%,0%)]">{billedTo.address}</p>
          )}
          {billedTo.gstin && (
            <p className="text-[11px] text-[hsl(0,0%,0%)]">GSTIN: {billedTo.gstin}</p>
          )}
          {billedTo.contact && (
            <p className="text-[11px] text-[hsl(0,0%,0%)]">Contact: {billedTo.contact}</p>
          )}
        </div>
      </div>
      {isShippedDifferent ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[hsl(0,0%,0%)] uppercase tracking-wider mb-1">
            Shipped To
          </h3>
          <div className="bg-[hsl(0,0%,100%)] border border-[hsl(0,0%,0%)] p-1 rounded-lg space-y-0.5">
            <p className="font-semibold text-[hsl(0,0%,0%)] text-[13px]">{shippedTo.name}</p>
            {shippedTo.address && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">{shippedTo.address}</p>
            )}
            {shippedTo.gstin && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">GSTIN: {shippedTo.gstin}</p>
            )}
            {shippedTo.contact && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">Contact: {shippedTo.contact}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[hsl(0,0%,0%)] uppercase tracking-wider mb-1">
            SHIPPED TO
          </h3>
          <div className="bg-[hsl(0,0%,100%)] border border-[hsl(0,0%,0%)] p-1 rounded-lg space-y-0.5">
            <p className="font-semibold text-[hsl(0,0%,0%)] text-[13px]">{billedTo.name}</p>
            {billedTo.address && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">{billedTo.address}</p>
            )}
            {billedTo.gstin && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">GSTIN: {billedTo.gstin}</p>
            )}
            {billedTo.contact && (
              <p className="text-[11px] text-[hsl(0,0%,0%)]">Contact: {billedTo.contact}</p>
            )}
          </div>
        </div>
      )}
    </div> 
  );

  const ItemsTable = ({ pageItems, isLastPage }) => (
    <div className={`${!isLastPage ? 'mb-2' : 'mb-2'}`}>
      <div className="overflow-hidden rounded-lg border border-[hsl(0,0%,0%)]">
        <table className="w-full">
          <thead>
            <tr className="bg-[hsl(0,0%,100%)] border-b border-[hsl(0,0%,0%)] text-black">
              <th className="text-left py-2 px-2 font-semibold text-xs w-[40px]">Sr No</th>
              <th className="text-left py-2 px-2 font-semibold text-xs w-[40%]">Item</th>
              <th className="text-center py-2 px-2 font-semibold text-xs w-[12%]">Quantity</th>
              <th className="text-center py-2 px-2 font-semibold text-xs w-[14%]">Rate</th>
              <th className="text-center py-2 px-2 font-semibold text-xs w-[14%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, idx) => {
              const globalIndex = pages.flat().findIndex(i => i === item);
              return (
                <tr
                  key={idx}
                  className={`border-b border-[hsl(0,0%,0%)]`}
                >
                  <td className="py-2 px-2 text-xs text-left text-[hsl(0,0%,0%)]">{globalIndex + 1}</td>
                  <td className="py-2 px-2 text-xs text-[hsl(0,0%,0%)] font-medium w-[40%]">{item.name}</td>
                  <td className="py-2 px-2 text-xs text-center text-[hsl(0,0%,0%)] w-[12%]">{item.quantity}</td>
                  <td className="py-2 px-2 text-xs text-center text-[hsl(0,0%,0%)] w-[14%]">₹{item.unit_price}</td>
                  <td className="py-2 px-2 text-xs text-center text-[hsl(0,0%,0%)] w-[14%]">₹{(item.unit_price * item.quantity).toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Fill empty rows to maintain consistent height */}
            {Array.from({ length: ITEMS_PER_PAGE - pageItems.length }, (_, idx) => (
              <tr key={`empty-${idx}`} className="border-b border-[hsl(220_13%_91%)]">
                <td className="py-2 px-2 text-xs">&nbsp;</td>
                <td className="py-2 px-2 text-xs" colSpan={4}>&nbsp;</td>
              </tr>
            ))} 
          </tbody>
        </table>
      </div>
    </div>
  );
const Totals = () => (
  <div className="flex justify-between mb-4">
    {/* Bank Details */}
    <div className="text-left space-y-1">
      <div className="font-semibold text-xs mb-1">Bank Details</div>
      {companyInfo?.bank_name && (
        <div className="text-xs">
          <span className="font-medium">Bank Name:</span> {companyInfo.bank_name}
        </div>
      )}
      {companyInfo?.bank_account_number && (
        <div className="text-xs">
          <span className="font-medium">A/C No:</span> {companyInfo.bank_account_number}
        </div>
      )}
      {companyInfo?.bank_ifsc && (
        <div className="text-xs">
          <span className="font-medium">IFSC:</span> {companyInfo.bank_ifsc}
        </div>
      )}
      {companyInfo?.bank_branch && (
        <div className="text-xs">
          <span className="font-medium">Branch:</span> {companyInfo.bank_branch}
        </div>
      )}
    </div>
    {/* Totals */}
    <div className="space-y-1 text-right">
      <div>
        <span className="font-semibold text-xs">Subtotal:</span>
        <span className="ml-2 text-xs">₹{subtotal.toFixed(2)}</span>
      </div>
      {discount > 0 && (
        <div>
          <span className="font-semibold text-black text-xs">Discount ({discount}%):</span>
          <span className="ml-2 text-black text-xs">-₹{(subtotal * discount / 100).toFixed(2)}</span>
        </div>
      )}
      {roundingOff !== 0 && (
        <div>
          <span className="font-semibold text-xs">Rounding Off:</span>
          <span className="ml-2 text-xs">{roundingOff >= 0 ? '+' : ''}₹{roundingOff.toFixed(2)}</span>
        </div>
      )}
      <div className="border-t border-[hsl(0,0%,0%)] pt-1">
        <span className="font-bold text-sm">Total:</span>
        <span className="ml-2 font-bold text-sm">₹{total.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

  const Footer = () => (
    <div>
      {note && note.trim().length > 0 && (
        <div className="mb-2 text-xs border border-black p-1 rounded-md text-[hsl(0,0%,0%)]">
          <strong>Remark: </strong>
          {note}
        </div>
      )}
      <div className="border-t border-[hsl(0,0%,0%)] pt-1">
        <div className="text-center space-y-0.5">
          <p className="text-[hsl(0,0%,0%)] font-semibold text-xs">
            {companyInfo?.footer_text }
          </p>
          <p className="text-[hsl(0,0%,0%)] font-semibold text-[10px]">
            This is a computer-generated invoice and does not require a physical signature.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div id="bill-pdf">
      {pages.map((pageItems, pageIndex) => (
        <div
          key={pageIndex}
          className="bg-white p-8 w-[210mm] h-[297mm] mx-auto shadow-lg border border-[hsl(220_13%_91%)] flex flex-col justify-between"
          style={{ 
            width: '210mm',
            height: '297mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
         {/* <div className="float-right">
         <h2 className="text-2xl font-bold text-[hsl(0,0%,0%)]">INVOICE</h2>
       </div> */}
          <div className="flex-1">
            <Header />
            {pageIndex === 0 && <BillDetails />}
            <ItemsTable 
              pageItems={pageItems} 
              isLastPage={pageIndex === pages.length - 1} 
            />
            {pageIndex === pages.length - 1 && <Totals />}
          </div>
          <Footer />
          {/* Page number */}
          {pages.length > 1 && (
            <div className="text-center text-sm text-[hsl(0,0%,0%)] mt-2">
              Page {pageIndex + 1} of {pages.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default BillPDF;