"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { DisplayInvoice } from "@/components/invoice-management";

// ✅ Optional: register custom font
// Font.register({
//   family: "Inter",
//   src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa.ttf",
// });

const styles = StyleSheet.create({
  page: {
    fontSize: 10.5,
    padding: 40,
    lineHeight: 1.5,
    color: "#111827",
    fontFamily: "Helvetica",
  },

  // ---------- HEADER ----------
  headerWithLogo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoSmall: {
    width: 50,
    height: 45,
    marginRight: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  companyInfo: {
    fontSize: 9.5,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  invoiceBox: {
    alignItems: "flex-end",
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#4b5563",
    marginTop: 3,
  },
  statusBadge: {
    marginTop: 8,
    backgroundColor: "#dbeafe",
    color: "#1e3a8a",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: "flex-end",
  },

  // ---------- DETAILS ----------
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  column: {
    width: "48%",
  },
  label: {
    fontSize: 8.5,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10.5,
    marginBottom: 8,
  },
  bold: {
    fontWeight: "bold",
  },

  // ---------- TABLE ----------
  tableContainer: {
    marginTop: 10,
    border: "1 solid #e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  cellDescription: { width: "50%", textAlign: "left" },
  cellQty: { width: "15%", textAlign: "right" },
  cellRate: { width: "15%", textAlign: "right" },
  cellAmount: { width: "20%", textAlign: "right" },

  // ---------- TOTALS ----------
  totalsSection: {
    marginTop: 25,
    marginLeft: "auto",
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    fontSize: 10,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1 solid #111827",
    fontSize: 12,
    fontWeight: "bold",
  },

  // ---------- NOTES ----------
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 9.5,
    color: "#4b5563",
    lineHeight: 1.4,
  },

  // ---------- FOOTER ----------
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
    borderTop: "0.5 solid #e5e7eb",
    paddingTop: 8,
  },
});

interface InvoicePDFProps {
  invoice: DisplayInvoice;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* ---------- HEADER ---------- */}
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <View style={styles.headerWithLogo}>
            <Image style={styles.logoSmall} src="/logo.png" />
            <View>
              <Text style={styles.companyName}>SUNRICORT IT N SECURITY</Text>
            </View>
          </View>
          <Text style={styles.companyInfo}>
            12869, Great N Rd{"\n"}
            Chibombo 00000{"\n"}
            Phone: 095 6282792{"\n"}
            Email: info@sunricort.com
          </Text>
        </View>

        <View style={[styles.column, styles.invoiceBox]}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
          <Text style={styles.statusBadge}>
            {invoice.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ---------- DETAILS ---------- */}
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.label}>Invoice Number</Text>
          <Text style={styles.value}>{invoice.invoiceNumber}</Text>

          <Text style={styles.label}>Issue Date</Text>
          <Text style={styles.value}>
            {new Date(invoice.issueDate).toLocaleDateString()}
          </Text>

          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>
            {new Date(invoice.dueDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={[styles.value, styles.bold]}>
            {invoice.customerName}
          </Text>
          {invoice.customerEmail && (
            <Text style={[styles.value, { color: "#6b7280" }]}>
              {invoice.customerEmail}
            </Text>
          )}
        </View>
      </View>

      {/* ---------- ITEMS TABLE ---------- */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.cellDescription}>Description</Text>
          <Text style={styles.cellQty}>Qty</Text>
          <Text style={styles.cellRate}>Rate</Text>
          <Text style={styles.cellAmount}>Amount</Text>
        </View>

        {(invoice as any).items?.map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.cellDescription}>{item.description}</Text>
            <Text style={styles.cellQty}>{item.quantity}</Text>
            <Text style={styles.cellRate}>
              K{parseFloat(item.unitPrice).toFixed(2)}
            </Text>
            <Text style={styles.cellAmount}>
              K{parseFloat(item.total).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* ---------- TOTALS ---------- */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text>Subtotal</Text>
          <Text>K{parseFloat(invoice.subtotal).toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>Tax ({parseFloat(invoice.taxRate || "0").toFixed(1)}%)</Text>
          <Text>K{parseFloat(invoice.taxAmount || "0").toFixed(2)}</Text>
        </View>
        <View style={styles.grandTotal}>
          <Text>Total</Text>
          <Text>K{parseFloat(invoice.total).toFixed(2)}</Text>
        </View>
      </View>

      {/* ---------- NOTES & TERMS ---------- */}
      {invoice.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.sectionText}>{invoice.notes}</Text>
        </View>
      )}

      {invoice.terms && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.sectionText}>{invoice.terms}</Text>
        </View>
      )}

      {/* ---------- FOOTER ---------- */}
      <View style={styles.footer}>
        <Text>Thank you for trusting Sunricort!</Text>
      </View>
    </Page>
  </Document>
);
