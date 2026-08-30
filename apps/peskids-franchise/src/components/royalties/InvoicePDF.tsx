import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Brand colors
const BRAND_NAVY = '#2D2F8E';
const BRAND_PURPLE = '#6A469D';
const BRAND_GREEN = '#34B256';
const LIGHT_GRAY = '#f5f5f5';
const BORDER_GRAY = '#e0e0e0';

// Create styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_NAVY,
  },
  logo: {
    width: 120,
    height: 40,
  },
  invoiceTitle: {
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_NAVY,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  addressBox: {
    width: '45%',
  },
  addressLabel: {
    fontSize: 8,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND_NAVY,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 10,
    color: '#555',
    marginBottom: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND_NAVY,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_NAVY,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCol1: {
    width: '55%',
  },
  tableCol2: {
    width: '20%',
    textAlign: 'right',
  },
  tableCol3: {
    width: '25%',
    textAlign: 'right',
  },
  cellText: {
    fontSize: 10,
    color: '#333',
  },
  grossRevenueRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  grossRevenueText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: BRAND_PURPLE,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER_GRAY,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND_NAVY,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  footerContact: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
});

// Status colors mapping
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_REVIEW: '#d97706',
  APPROVED: '#2563eb',
  DISPUTED: '#dc2626',
  PAYMENT_PENDING: '#ea580c',
  PROCESSING: '#7c3aed',
  PAID: BRAND_GREEN,
  OVERDUE: '#dc2626',
  CANCELLED: '#6b7280',
};

export interface InvoicePDFData {
  invoiceNumber: string;
  franchiseeName: string;
  franchiseeEmail: string;
  franchiseePhone?: string | null;
  year: number;
  month: number;
  grossRevenue: number;
  royaltyAmount: number;
  royaltyPercent: number;
  brandFundAmount: number;
  brandFundPercent: number;
  systemsFeeAmount: number;
  systemsFeePercent: number;
  adjustmentAmount?: number | null;
  adjustmentReason?: string | null;
  totalAmount: number;
  status: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  logoPath?: string; // Full file system path to logo for server-side rendering
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const periodName = `${MONTHS[data.month - 1]} ${data.year}`;
  const statusColor = STATUS_COLORS[data.status] || '#6b7280';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header with Logo and Invoice Title */}
        <View style={styles.header}>
          <View style={{ alignItems: 'flex-start' }}>
            {/* Logo */}
            {data.logoPath && (
              <Image
                src={data.logoPath}
                style={{ width: 60, height: 60, borderRadius: 6, marginBottom: 8 }}
              />
            )}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: BRAND_NAVY }}>
              Acme Franchise Franchising LLC
            </Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceTitleText}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{data.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        </View>

        {/* From/To Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>From</Text>
            <Text style={styles.addressName}>Acme Franchise Franchising LLC</Text>
            <Text style={styles.addressText}>franchising@acmefranchise.com</Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Bill To</Text>
            <Text style={styles.addressName}>{data.franchiseeName}</Text>
            <Text style={styles.addressText}>{data.franchiseeEmail}</Text>
            {data.franchiseePhone && (
              <Text style={styles.addressText}>{data.franchiseePhone}</Text>
            )}
          </View>
        </View>

        {/* Invoice Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Period</Text>
            <Text style={styles.detailValue}>{periodName}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Invoice Date</Text>
            <Text style={styles.detailValue}>{formatDate(data.invoiceDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{formatDate(data.dueDate)}</Text>
          </View>
        </View>

        {/* Invoice Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableCol1}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Rate</Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Amount</Text>
            </View>
          </View>

          {/* Gross Revenue */}
          <View style={styles.grossRevenueRow}>
            <View style={styles.tableCol1}>
              <Text style={styles.grossRevenueText}>Gross Revenue</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={styles.cellText}></Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.grossRevenueText, { textAlign: 'right' }]}>
                {formatCurrency(data.grossRevenue)}
              </Text>
            </View>
          </View>

          {/* Royalty Fee */}
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <View style={styles.tableCol1}>
              <Text style={styles.cellText}>Royalty Fee</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {data.royaltyPercent.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {formatCurrency(data.royaltyAmount)}
              </Text>
            </View>
          </View>

          {/* Brand Fund */}
          <View style={styles.tableRow}>
            <View style={styles.tableCol1}>
              <Text style={styles.cellText}>Brand Fund</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {data.brandFundPercent.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {formatCurrency(data.brandFundAmount)}
              </Text>
            </View>
          </View>

          {/* Systems Fee */}
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <View style={styles.tableCol1}>
              <Text style={styles.cellText}>Systems Fee</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {data.systemsFeePercent.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.cellText, { textAlign: 'right' }]}>
                {formatCurrency(data.systemsFeeAmount)}
              </Text>
            </View>
          </View>

          {/* Adjustment (if any) */}
          {data.adjustmentAmount && data.adjustmentAmount !== 0 && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol1}>
                <Text style={styles.cellText}>
                  Adjustment{data.adjustmentReason ? ` (${data.adjustmentReason})` : ''}
                </Text>
              </View>
              <View style={styles.tableCol2}>
                <Text style={styles.cellText}></Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={[
                  styles.cellText,
                  { textAlign: 'right', color: data.adjustmentAmount < 0 ? BRAND_GREEN : '#dc2626' }
                ]}>
                  {formatCurrency(data.adjustmentAmount)}
                </Text>
              </View>
            </View>
          )}

          {/* Total */}
          <View style={styles.totalRow}>
            <View style={styles.tableCol1}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={styles.totalLabel}></Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={[styles.totalAmount, { textAlign: 'right' }]}>
                {formatCurrency(data.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Payment Instructions</Text>
          <Text style={styles.footerText}>
            Please remit payment by {formatDate(data.dueDate)}
          </Text>
          <Text style={styles.footerText}>
            ACH or check payable to Acme Franchise
          </Text>
          <View style={styles.footerContact}>
            <View>
              <Text style={[styles.footerText, { color: '#999', fontSize: 8 }]}>
                Questions? Contact us at:
              </Text>
              <Text style={styles.footerText}>
                franchising@acmefranchise.com
              </Text>
            </View>
            <View>
              <Text style={[styles.footerText, { textAlign: 'right', color: '#999', fontSize: 8 }]}>
                Thank you for being part of the
              </Text>
              <Text style={[styles.footerText, { textAlign: 'right', color: BRAND_NAVY, fontWeight: 'bold' }]}>
                Acme Franchise Family!
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
