import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ============================================================
// PROFESSIONAL INVOICE - CLEAN MINIMAL DESIGN
// ============================================================

const styles = StyleSheet.create({
  // Page
  page: {
    padding: 0,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },

  // Top Banner
  topBanner: {
    backgroundColor: '#2c3e50',
    height: 8,
  },

  // Main Content Container
  content: {
    padding: 36,
    paddingTop: 24,
  },

  // ==================== HEADER ====================
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  logoBox: {
    width: 56,
    height: 56,
    marginRight: 14,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  brandContact: {
    fontSize: 8,
    color: '#5d6d7e',
    lineHeight: 1.6,
  },

  // Invoice Title Area
  invoiceTitleArea: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    letterSpacing: 2,
    marginBottom: 10,
  },
  invoiceInfoGrid: {
    alignItems: 'flex-end',
  },
  invoiceInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  invoiceInfoLabel: {
    fontSize: 8,
    color: '#7f8c8d',
    width: 70,
    textAlign: 'right',
    marginRight: 8,
  },
  invoiceInfoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    width: 90,
    textAlign: 'right',
  },

  // ==================== PARTIES SECTION ====================
  partiesRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 20,
  },
  partyCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  partyCardAlt: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  partyCardSalesman: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#9b59b6',
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  partyText: {
    fontSize: 8,
    color: '#5d6d7e',
    lineHeight: 1.5,
    marginBottom: 2,
  },
  partyGstin: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginTop: 4,
  },

  // ==================== TABLE ====================
  tableSection: {
    marginBottom: 20,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeadCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    backgroundColor: '#fafbfc',
  },
  tableCell: {
    fontSize: 9,
    color: '#34495e',
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
  },
  // Column widths
  colNum: { width: '7%', textAlign: 'center' },
  colItem: { width: '45%', paddingRight: 10 },
  colQty: { width: '12%', textAlign: 'center' },
  colRate: { width: '18%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },

  // ==================== SUMMARY ====================
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountWords: {
    flex: 1.2,
    paddingRight: 30,
    paddingTop: 8,
  },
  amountWordsTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountWordsText: {
    fontSize: 9,
    color: '#34495e',
    fontStyle: 'italic',
    lineHeight: 1.5,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
  },
  totalsCard: {
    width: 220,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  totalsLabel: {
    fontSize: 9,
    color: '#5d6d7e',
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
  },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#2c3e50',
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  totalsFinalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  // ==================== REMARKS ====================
  remarksBox: {
    backgroundColor: '#fef9e7',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
  },
  remarksLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 8,
    color: '#34495e',
    lineHeight: 1.5,
  },

  // ==================== FOOTER ====================
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  footerGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  qrArea: {
    alignItems: 'center',
    width: 100,
  },
  qrImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f9fa',
    padding: 4,
    borderRadius: 4,
  },
  qrText: {
    fontSize: 7,
    color: '#7f8c8d',
    marginTop: 6,
    textAlign: 'center',
  },
  bankArea: {
    flex: 1,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#ecf0f1',
  },
  bankTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bankLine: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 8,
    color: '#7f8c8d',
    width: 65,
  },
  bankValue: {
    fontSize: 8,
    color: '#2c3e50',
    flex: 1,
  },
  termsArea: {
    flex: 1.3,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#ecf0f1',
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  termLine: {
    fontSize: 7,
    color: '#5d6d7e',
    marginBottom: 4,
    lineHeight: 1.4,
    paddingLeft: 10,
  },

  // Signature Area
  signatureArea: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  signatureBlock: {
    width: 180,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
    marginBottom: 6,
    height: 40,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#5d6d7e',
  },

  // Footer Note
  footerNote: {
    textAlign: 'center',
    marginTop: 20,
  },
  footerNoteMain: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  footerNoteSub: {
    fontSize: 7,
    color: '#95a5a6',
    fontStyle: 'italic',
  },

  // Bottom Banner
  bottomBanner: {
    backgroundColor: '#2c3e50',
    height: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  return  amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const BillPDF = ({
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
  shippedTo = { name: '', contact: '', address: '', gstin: '' },
  companyInfo = null,
  logoDataUrl = null,
  qrCodeDataUrl = null
}) => {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

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
  const discountAmt = subtotal * (discount / 100);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Color Bar */}
        <View style={styles.topBanner} />

        <View style={styles.content}>
          {/* ========== HEADER ========== */}
          <View style={styles.headerSection}>
            <View style={styles.brandArea}>
              {logoDataUrl ? (
                <View style={styles.logoBox}>
                  <Image src={logoDataUrl} style={styles.logo} />
                </View>
              ) : (
                <View style={styles.logoBox}>
                  <Text style={{ fontSize: 8, color: '#bdc3c7' }}>LOGO</Text>
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
                    <Text>Phone: {companyInfo?.phone || companyInfo?.mobile}</Text>
                  )}
                  {companyInfo?.email && <Text>Email: {companyInfo.email}</Text>}
                  {companyInfo?.gstin && (
                    <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 2 }}>GSTIN: {companyInfo.gstin}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.invoiceTitleArea}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <View style={styles.invoiceInfoGrid}>
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
          </View>

          {/* ========== PARTIES ========== */}
          <View style={styles.partiesRow}>
            <View style={styles.partyCard}>
              <Text style={styles.partyLabel}>Billed To</Text>
              <Text style={styles.partyName}>{billedTo.name || '—'}</Text>
              {billedTo.address && <Text style={styles.partyText}>{billedTo.address}</Text>}
              {billedTo.contact && <Text style={styles.partyText}>Ph: {billedTo.contact}</Text>}
              {billedTo.gstin && <Text style={styles.partyGstin}>GSTIN: {billedTo.gstin}</Text>}
            </View>

            <View style={styles.partyCardAlt}>
              <Text style={styles.partyLabel}>Shipped To</Text>
              <Text style={styles.partyName}>{shipTo.name || '—'}</Text>
              {shipTo.address && <Text style={styles.partyText}>{shipTo.address}</Text>}
              {shipTo.contact && <Text style={styles.partyText}>Ph: {shipTo.contact}</Text>}
              {shipTo.gstin && <Text style={styles.partyGstin}>GSTIN: {shipTo.gstin}</Text>}
            </View>

            <View style={styles.partyCardSalesman}>
              <Text style={styles.partyLabel}>Salesman</Text>
              <Text style={styles.partyName}>{salesman_name || '—'}</Text>
              {salesman_address && <Text style={styles.partyText}>{salesman_address}</Text>}
              {salesman_contact && <Text style={styles.partyText}>Ph: {salesman_contact}</Text>}
            </View>
          </View>

          {/* ========== TABLE ========== */}
          <View style={styles.tableSection}>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeadCell, styles.colItem]}>Item Description</Text>
              <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeadCell, styles.colRate]}>Rate</Text>
              <Text style={[styles.tableHeadCell, styles.colTotal]}>Amount</Text>
            </View>

            <View style={styles.tableBody}>
              {items.map((item, i) => {
                const isLast = i === items.length - 1;
                const rowStyle = i % 2 === 1 ? styles.tableRowAlt : (isLast ? styles.tableRowLast : styles.tableRow);
                return (
                  <View key={i} style={rowStyle}>
                    <Text style={[styles.tableCell, styles.colNum]}>{i + 1}</Text>
                    <Text style={[styles.tableCell, styles.colItem]}>{item.name}</Text>
                    <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, styles.colRate]}>{formatAmount(item.unit_price)}</Text>
                    <Text style={[styles.tableCellBold, styles.colTotal]}>
                      {formatAmount(item.unit_price * item.quantity)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ========== SUMMARY ========== */}
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
                  <Text style={styles.totalsLabel}>Discount ({discount}%)</Text>
                  <Text style={styles.totalsValue}>- {formatAmount(discountAmt)}</Text>
                </View>
              )}
              {roundingOff !== 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Round Off</Text>
                  <Text style={styles.totalsValue}>
                    {roundingOff >= 0 ? '+' : ''}{formatAmount(Math.abs(roundingOff))}
                  </Text>
                </View>
              )}
              <View style={styles.totalsFinal}>
                <Text style={styles.totalsFinalLabel}>Total Due</Text>
                <Text style={styles.totalsFinalValue}>{formatAmount(total)}</Text>
              </View>
            </View>
          </View>

          {/* ========== REMARKS ========== */}
          {note && note.trim() && (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksLabel}>Remarks / Notes</Text>
              <Text style={styles.remarksText}>{note}</Text>
            </View>
          )}

          {/* ========== FOOTER ========== */}
          <View style={styles.footerSection}>
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
                    <Text style={styles.bankLabel}>Account</Text>
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

            {/* Signature */}
            <View style={styles.signatureArea}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
              </View>
            </View>

            {/* Footer Note */}
            <View style={styles.footerNote}>
              {companyInfo?.footer_text && (
                <Text style={styles.footerNoteMain}>{companyInfo.footer_text}</Text>
              )}
              <Text style={styles.footerNoteSub}>
                Computer generated invoice • No signature required
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Color Bar */}
        <View style={styles.bottomBanner} />
      </Page>
    </Document>
  );
};

export default BillPDF;