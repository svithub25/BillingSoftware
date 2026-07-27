import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ============================================================
// PAGINATION CONFIG
// ============================================================

const ITEMS_PER_SINGLE_PAGE = 10;   // Single page has addresses + totals, max 8 items
const ITEMS_PER_PAGE = 15;         // Multi-page invoices: 15 items per middle page
const ITEMS_LAST_PAGE = 12;        // Last page max 12 items (has totals section)

const theme = {
  primary: '#042040',   // Deep Navy Blue
  accent: '#b98f3b',    // Gold
  bg: '#ffffffff',        // Off-white
  textSecondary: '#677688', // Slate Gray
  borderLight: '#a7b3c2', // Light Gray-blue
  borderDark: '#35465b',  // Muted Navy
  white: '#ffffff'
};

const styles = StyleSheet.create({
  page: {
    padding: 25,
    paddingBottom: 135,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: theme.bg,
    color: theme.primary,
  },

  // Header
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.accent,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  logoBox: {
    width: 75,
    height: 75,
    marginRight: 35,
  },
  logo: {
    width: 75,
    height: 75,
    objectFit: 'contain',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: theme.primary,
  },
  brandContact: {
    fontSize: 10,
    lineHeight: 1.3,
    color: theme.textSecondary,
  },
  invoiceTitleArea: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: theme.accent,
  },
  invoiceInfoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  invoiceInfoLabel: {
    fontSize: 10,
    width: 60,
    textAlign: 'right',
    marginRight: 6,
    color: theme.textSecondary,
  },
  invoiceInfoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right',
    color: theme.primary,
  },

  // Parties Section
  partiesRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  partyCard: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.white,
    borderRadius: 4,
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.borderLight,
    paddingBottom: 2,
    color: theme.accent,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: theme.primary,
  },
  partyText: {
    fontSize: 10,
    lineHeight: 1.3,
    color: theme.textSecondary,
  },
  partyGstin: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
    color: theme.primary,
  },

  // Table
  tableSection: {
    marginBottom: 12,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeadCell: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: theme.white,
  },
  tableBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.borderLight,
    backgroundColor: theme.white,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.borderLight,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 10,
    color: theme.primary,
  },
  tableCellBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: theme.primary,
  },
  colNum: { width: '6%', textAlign: 'center' },
  colItem: { width: '46%', paddingRight: 6 },
  colQty: { width: '12%', textAlign: 'center' },
  colRate: { width: '18%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },

  // Summary
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountWords: {
    flex: 1,
    paddingRight: 25,
  },
  amountWordsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    color: theme.textSecondary,
  },
  amountWordsText: {
    fontSize: 10,
    fontStyle: 'italic',
    padding: 8,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.white,
    borderRadius: 4,
    color: theme.primary,
  },
  totalsCard: {
    width: 200,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.white,
    borderRadius: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.borderLight,
  },
  totalsLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  totalsValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: theme.primary,
  },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.accent,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: theme.white,
  },
  totalsFinalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: theme.white,
  },

  // Remarks
  remarksBox: {
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.white,
    borderRadius: 4,
  },
  remarksLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    color: theme.textSecondary,
  },
  remarksText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: theme.primary,
  },

  // Footer - fixed at bottom
  footerSection: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    borderTopWidth: 1.5,
    borderTopColor: theme.accent,
    paddingTop: 6,
  },
  footerGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 5,
  },
  qrArea: {
    alignItems: 'center',
    width: 75,
  },
  qrImage: {
    width: 65,
    height: 65,
  },
  qrText: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    color: theme.textSecondary,
  },
  bankArea: {
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: theme.borderLight,
  },
  bankTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 3,
    color: theme.accent,
  },
  bankLine: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bankLabel: {
    fontSize: 9,
    width: 50,
    color: theme.textSecondary,
  },
  bankValue: {
    fontSize: 9,
    flex: 1,
    color: theme.primary,
  },
  termsArea: {
    flex: 1.2,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: theme.borderLight,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 3,
    color: theme.accent,
  },
  termLine: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.3,
    color: theme.textSecondary,
  },
  signatureArea: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  signatureBlock: {
    width: 150,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: theme.borderDark,
    marginBottom: 2,
    height: 22,
  },
  signatureLabel: {
    fontSize: 9,
    color: theme.textSecondary,
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 4,
  },
  footerNoteMain: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: theme.primary,
  },
  footerNoteSub: {
    fontSize: 9,
    fontStyle: 'italic',
    color: theme.textSecondary,
  },
  pageNumber: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
    fontFamily: 'Helvetica-Bold',
    color: theme.textSecondary,
  },
  continuedNote: {
    fontSize: 10,
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: 6,
    color: theme.textSecondary,
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function numberToWords(num) {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  let words = '';

  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';

  if (remainder > 0) {
    if (remainder < 20) {
      words += ones[remainder];
    } else {
      words += tens[Math.floor(remainder / 10)];
      if (remainder % 10 > 0) words += ' ' + ones[remainder % 10];
    }
  }

  return words.trim();
}

function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = 'Rupees ' + numberToWords(rupees);
  if (paise > 0) words += ' and ' + numberToWords(paise) + ' Paise';
  return words + ' Only';
}

function formatAmount(amount) {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Paginate items into pages with smart distribution
// Rules:
// - ≤10 items: single page
// - 11-15 items: 2 pages (10 on first, rest on second)
// - >15 items: first/middle pages max 15, last page max 12
// - Items distributed evenly for better spread across pages
function paginateItems(items) {
  const totalItems = items.length;

  // Single page: 10 or fewer items
  if (totalItems <= ITEMS_PER_SINGLE_PAGE) {
    return [items];
  }

  // 11-15 items: 2 pages (10 on first, rest on second)
  if (totalItems <= ITEMS_PER_PAGE) {
    return [items.slice(0, 10), items.slice(10)];
  }

  // >15 items: Calculate pages needed
  // P pages can hold: 15*(P-1) + 12 = 15P - 3 items
  // So P = ceil((N + 3) / 15)
  const pagesNeeded = Math.max(2, Math.ceil((totalItems + 3) / 15));

  // Distribute items evenly across pages while respecting limits
  const pages = [];
  let remaining = [...items];

  for (let i = 0; i < pagesNeeded; i++) {
    const isLast = i === pagesNeeded - 1;
    const maxCapacity = isLast ? ITEMS_LAST_PAGE : ITEMS_PER_PAGE;
    const pagesRemaining = pagesNeeded - i;

    // Calculate even distribution target
    let target = Math.ceil(remaining.length / pagesRemaining);

    // Don't exceed page capacity
    target = Math.min(target, maxCapacity);

    // Ensure we don't leave more items than future pages can hold
    // Future capacity: (remaining middle pages) * 15 + last page 12
    if (!isLast) {
      const futureCapacity = (pagesRemaining - 2) * ITEMS_PER_PAGE + ITEMS_LAST_PAGE;
      const minToTake = remaining.length - futureCapacity;
      target = Math.max(target, minToTake);
      target = Math.min(target, maxCapacity); // Still respect capacity
    }

    pages.push(remaining.slice(0, target));
    remaining = remaining.slice(target);
  }

  return pages;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

const Header = ({ companyInfo, logoDataUrl, billNumber, today }) => (
  <View style={styles.headerSection}>
    <View style={styles.brandArea}>
      {logoDataUrl && (
        <View style={styles.logoBox}>
          <Image src={logoDataUrl} style={styles.logo} />
        </View>
      )}
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>
          {companyInfo?.company_name || 'Your Company Name'}
        </Text>
        <View style={styles.brandContact}>
          {companyInfo?.address_line1 && <Text>{companyInfo.address_line1}</Text>}
          {companyInfo?.address_line2 && <Text>{companyInfo.address_line2}</Text>}
          {(companyInfo?.city || companyInfo?.state || companyInfo?.pincode) && (
            <Text>{[companyInfo?.city, companyInfo?.state, companyInfo?.pincode].filter(Boolean).join(', ')}</Text>
          )}
          {(companyInfo?.phone || companyInfo?.mobile) && (
            <Text>Ph: {companyInfo?.phone || companyInfo?.mobile}</Text>
          )}
          {companyInfo?.email && <Text>Email: {companyInfo.email}</Text>}
          {companyInfo?.gstin && (
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>GSTIN: {companyInfo.gstin}</Text>
          )}
        </View>
      </View>
    </View>

    <View style={styles.invoiceTitleArea}>
      <Text style={styles.invoiceTitle}>INVOICE</Text>
      <View style={styles.invoiceInfoRow}>
        <Text style={styles.invoiceInfoLabel}>Invoice No.</Text>
        <Text style={styles.invoiceInfoValue}>{billNumber}</Text>
      </View>
      <View style={styles.invoiceInfoRow}>
        <Text style={styles.invoiceInfoLabel}>Date</Text>
        <Text style={styles.invoiceInfoValue}>{today}</Text>
      </View>
    </View>
  </View>
);

const PartiesSection = ({ billedTo, shipTo, salesman_name, salesman_address, salesman_contact }) => (
  <View style={styles.partiesRow}>
    <View style={styles.partyCard}>
      <Text style={styles.partyLabel}>Billed To</Text>
      <Text style={styles.partyName}>{billedTo.name || '—'}</Text>
      {billedTo.address && <Text style={styles.partyText}>{billedTo.address}</Text>}
      {billedTo.contact && <Text style={styles.partyText}>Ph: {billedTo.contact}</Text>}
      {billedTo.gstin && <Text style={styles.partyGstin}>GSTIN: {billedTo.gstin}</Text>}
    </View>

    <View style={styles.partyCard}>
      <Text style={styles.partyLabel}>Shipped To</Text>
      <Text style={styles.partyName}>{shipTo.name || '—'}</Text>
      {shipTo.address && <Text style={styles.partyText}>{shipTo.address}</Text>}
      {shipTo.contact && <Text style={styles.partyText}>Ph: {shipTo.contact}</Text>}
      {shipTo.gstin && <Text style={styles.partyGstin}>GSTIN: {shipTo.gstin}</Text>}
    </View>

    {salesman_name && (
      <View style={styles.partyCard}>
        <Text style={styles.partyLabel}>Salesman</Text>
        <Text style={styles.partyName}>{salesman_name || '—'}</Text>
        {salesman_address && <Text style={styles.partyText}>{salesman_address}</Text>}
        {salesman_contact && <Text style={styles.partyText}>Ph: {salesman_contact}</Text>}
      </View>
    )}
  </View>
);

const ItemsTable = ({ pageItems, startIndex, isLastPageTable }) => (
  <View style={styles.tableSection}>
    <View style={styles.tableHead}>
      <Text style={[styles.tableHeadCell, styles.colNum]}>#</Text>
      <Text style={[styles.tableHeadCell, styles.colItem]}>Item Description</Text>
      <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
      <Text style={[styles.tableHeadCell, styles.colRate]}>Rate</Text>
      <Text style={[styles.tableHeadCell, styles.colTotal]}>Amount</Text>
    </View>

    <View style={styles.tableBody}>
      {pageItems.map((item, i) => {
        const isLast = i === pageItems.length - 1;
        const itemNumber = startIndex + i + 1;
        const batchText = item.batches && item.batches.length > 0
          ? item.batches.map(b => `${b.batch_number || 'No Batch'} (${b.qty || b.quantity})`).join(', ')
          : null;
        const discVal = parseFloat(item.discount) || 0;
        const discType = item.discount_type || 'percent';
        const grossAmt = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0);
        const itemDiscAmount = discType === 'amount' ? Math.min(grossAmt, discVal) : (grossAmt * discVal) / 100;
        const netAmt = item.total_price !== undefined && item.total_price !== null ? item.total_price : Math.max(0, grossAmt - itemDiscAmount);

        return (
          <View key={i} style={isLast && isLastPageTable ? styles.tableRowLast : styles.tableRow}>
            <Text style={[styles.tableCell, styles.colNum]}>{itemNumber}</Text>
            <View style={[styles.colItem, { flexDirection: 'column' }]}>
              <Text style={styles.tableCell}>{item.name}</Text>
              {/* {batchText ? (
                <Text style={{ fontSize: 8, color: theme.textSecondary, marginTop: 2 }}>
                  Batches: {batchText}
                </Text>
              ) : null} */}
              {discVal > 0 ? (
                <Text style={{ fontSize: 8, color: theme.accent, marginTop: 1 }}>
                  Discount: {discType === 'amount' ? `${discVal}` : `${discVal}%`} (-{formatAmount(itemDiscAmount)})
                </Text>
              ) : null}
            </View>
            <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, styles.colRate]}>{formatAmount(item.unit_price)}</Text>
            <Text style={[styles.tableCellBold, styles.colTotal]}>
              {formatAmount(netAmt)}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
);

const SummarySection = ({ subtotal, discount, discountType, discountAmt, roundingOff, total }) => (
  <View style={styles.summarySection}>
    <View style={styles.amountWords}>
      <Text style={styles.amountWordsTitle}>Amount in Words</Text>
      <Text style={styles.amountWordsText}>{amountInWords(total)}</Text>
    </View>

    <View style={styles.totalsCard}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{formatAmount(subtotal)}</Text>
      </View>
      {discount > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>
            Discount {discountType === 'amount' ? `` : `(${discount}%)`}
          </Text>
          <Text style={styles.totalsValue}>- {formatAmount(discountAmt)}</Text>
        </View>
      )}
      {roundingOff !== 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Round Off</Text>
          <Text style={styles.totalsValue}>
            {roundingOff >= 0 ? '+' : '-'}{formatAmount(Math.abs(roundingOff))}
          </Text>
        </View>
      )}
      <View style={styles.totalsFinal}>
        <Text style={styles.totalsFinalLabel}>Total</Text>
        <Text style={styles.totalsFinalValue}>{formatAmount(total)}</Text>
      </View>
    </View>
  </View>
);

const Footer = ({ companyInfo, qrCodeDataUrl, pageNumber, totalPages }) => (
  <View style={styles.footerSection} fixed>
    <View style={styles.footerGrid}>
      {qrCodeDataUrl && (
        <View style={styles.qrArea}>
          <Image src={qrCodeDataUrl} style={styles.qrImage} />
          <Text style={styles.qrText}>Scan to Pay</Text>
        </View>
      )}

      <View style={styles.bankArea}>
        <Text style={styles.bankTitle}>Bank Details</Text>
        {companyInfo?.bank_name && (
          <View style={styles.bankLine}>
            <Text style={styles.bankLabel}>Bank</Text>
            <Text style={styles.bankValue}>{companyInfo.bank_name}</Text>
          </View>
        )}
        {companyInfo?.bank_account_number && (
          <View style={styles.bankLine}>
            <Text style={styles.bankLabel}>A/C No.</Text>
            <Text style={styles.bankValue}>{companyInfo.bank_account_number}</Text>
          </View>
        )}
        {companyInfo?.bank_ifsc && (
          <View style={styles.bankLine}>
            <Text style={styles.bankLabel}>IFSC</Text>
            <Text style={styles.bankValue}>{companyInfo.bank_ifsc}</Text>
          </View>
        )}
        {companyInfo?.bank_branch && (
          <View style={styles.bankLine}>
            <Text style={styles.bankLabel}>Branch</Text>
            <Text style={styles.bankValue}>{companyInfo.bank_branch}</Text>
          </View>
        )}
      </View>

      <View style={styles.termsArea}>
        <Text style={styles.termsTitle}>Terms & Conditions</Text>
        {[1, 2, 3, 4, 5].map(i => {
          const term = companyInfo?.[`terms_${i}`];
          return term ? (
            <Text key={i} style={styles.termLine}>• {term}</Text>
          ) : null;
        })}
      </View>
    </View>

    <View style={styles.signatureArea}>
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Authorized Signature</Text>
      </View>
    </View>

    <View style={styles.footerNote}>
      {companyInfo?.footer_text && (
        <Text style={styles.footerNoteMain}>{companyInfo.footer_text}</Text>
      )}
      <Text style={styles.footerNoteSub}>Computer generated invoice</Text>
      <Text style={styles.pageNumber}>Page {pageNumber} of {totalPages}</Text>
    </View>
  </View>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const BillPDF = ({
  billNumber,
  customer,
  items,
  discount = 0,
  discountType = 'percent',
  subtotal = 0,
  roundingOff = 0,
  total = 0,
  sale_type = "",
  salesman_name = "",
  salesman_contact = "",
  salesman_address = "",
  note = "",
  isShippedDifferent = false,
  shippedTo = { name: '', contact: '', address: '', gstin: '' },
  companyInfo = null,
  logoDataUrl = null,
  qrCodeDataUrl = null,
  billDate = null
}) => {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const displayDate = billDate ? new Date(billDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : today;

  const getBilledTo = () => {
    if (sale_type === "customer" || sale_type === "others") {
      return {
        name: customer?.name || '',
        address: customer?.address || '',
        contact: customer?.contact || '',
        gstin: customer?.gstin || ''
      };
    } else if (sale_type === "salesman") {
      return {
        name: salesman_name || '',
        address: salesman_address || '',
        contact: salesman_contact || '',
        gstin: ''
      };
    }
    return { name: '', address: '', contact: '', gstin: '' };
  };

  const billedTo = getBilledTo();
  const shipTo = isShippedDifferent ? shippedTo : billedTo;
  const discountAmt = (discountType || 'percent') === 'amount'
    ? Math.min(subtotal, discount)
    : subtotal * (discount / 100);

  // Paginate items
  const itemPages = paginateItems(items);
  const totalPages = itemPages.length;

  // Calculate starting index for each page
  let runningIndex = 0;

  return (
    <Document>
      {itemPages.map((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const pageNumber = pageIndex + 1;
        const startIndex = runningIndex;
        runningIndex += pageItems.length;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* Header on every page */}
            <Header
              companyInfo={companyInfo}
              logoDataUrl={logoDataUrl}
              billNumber={billNumber}
              today={displayDate}
            />

            {/* Parties section only on first page */}
            {isFirstPage && (
              <PartiesSection
                billedTo={billedTo}
                shipTo={shipTo}
                salesman_name={salesman_name}
                salesman_address={salesman_address}
                salesman_contact={salesman_contact}
              />
            )}

            {/* Items table for this page */}
            <ItemsTable
              pageItems={pageItems}
              startIndex={startIndex}
              isLastPageTable={isLastPage}
            />

            {/* Continued note on non-last pages */}
            {!isLastPage && (
              <Text style={styles.continuedNote}>...continued on next page</Text>
            )}

            {/* Summary and remarks only on last page */}
            {isLastPage && (
              <>
                <SummarySection
                  subtotal={subtotal}
                  discount={discount}
                  discountType={discountType}
                  discountAmt={discountAmt}
                  roundingOff={roundingOff}
                  total={total}
                />

                {note && note.trim() && (
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksLabel}>Remarks</Text>
                    <Text style={styles.remarksText}>{note}</Text>
                  </View>
                )}
              </>
            )}

            {/* Footer on every page with page number */}
            <Footer
              companyInfo={companyInfo}
              qrCodeDataUrl={qrCodeDataUrl}
              pageNumber={pageNumber}
              totalPages={totalPages}
            />
          </Page>
        );
      })}
    </Document>
  );
};

export default BillPDF;
