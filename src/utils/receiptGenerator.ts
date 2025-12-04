import jsPDF from "jspdf"

interface ReceiptData {
  transactionNumber: string
  transactionType: string
  date: Date
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  exchangeRate: number
  totalAmount: number
  customerName?: string
  customerEmail?: string
  customerAddress?: string
  branchName?: string
  branchCode?: string
  branchAddress?: string
  tellerName?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
}

export function generateReceiptPDF(data: ReceiptData): void {
  const doc = new jsPDF({
    unit: "mm",
    format: [80, 200],
  })

  const pageWidth = 80
  const margin = 5
  const contentWidth = pageWidth - 2 * margin
  let y = 10

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(data.companyName || "OpenCX Exchange", pageWidth / 2, y, { align: "center" })
  y += 5

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  if (data.companyAddress) {
    doc.text(data.companyAddress, pageWidth / 2, y, { align: "center" })
    y += 4
  }
  if (data.companyPhone) {
    doc.text(data.companyPhone, pageWidth / 2, y, { align: "center" })
    y += 4
  }

  y += 2
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("CURRENCY EXCHANGE RECEIPT", pageWidth / 2, y, { align: "center" })
  y += 6

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")

  doc.text("Transaction #:", margin, y)
  doc.text(data.transactionNumber, pageWidth - margin, y, { align: "right" })
  y += 4

  doc.text("Date:", margin, y)
  doc.text(data.date.toLocaleDateString(), pageWidth - margin, y, { align: "right" })
  y += 4

  doc.text("Time:", margin, y)
  doc.text(data.date.toLocaleTimeString(), pageWidth - margin, y, { align: "right" })
  y += 4

  doc.text("Type:", margin, y)
  doc.text(data.transactionType.toUpperCase(), pageWidth - margin, y, { align: "right" })
  y += 4

  if (data.branchName) {
    doc.text("Branch:", margin, y)
    doc.text(`${data.branchName} (${data.branchCode || ""})`, pageWidth - margin, y, { align: "right" })
    y += 4
  }

  if (data.tellerName) {
    doc.text("Teller:", margin, y)
    doc.text(data.tellerName, pageWidth - margin, y, { align: "right" })
    y += 4
  }

  y += 2
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  if (data.customerName) {
    doc.setFont("helvetica", "bold")
    doc.text("Customer:", margin, y)
    y += 4
    doc.setFont("helvetica", "normal")
    doc.text(data.customerName, margin, y)
    y += 4
    if (data.customerEmail) {
      doc.text(data.customerEmail, margin, y)
      y += 4
    }
    if (data.customerAddress) {
      const lines = doc.splitTextToSize(data.customerAddress, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 4
    }
    y += 2
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  doc.setFont("helvetica", "bold")
  doc.text("Exchange Details", margin, y)
  y += 5

  doc.setFont("helvetica", "normal")

  doc.text("You Give:", margin, y)
  const sourceFormatted = formatCurrency(data.sourceAmount, data.sourceCurrency)
  doc.setFont("helvetica", "bold")
  doc.text(sourceFormatted, pageWidth - margin, y, { align: "right" })
  y += 5

  doc.setFont("helvetica", "normal")
  doc.text("You Receive:", margin, y)
  const targetFormatted = formatCurrency(data.targetAmount, data.targetCurrency)
  doc.setFont("helvetica", "bold")
  doc.text(targetFormatted, pageWidth - margin, y, { align: "right" })
  y += 5

  doc.setFont("helvetica", "normal")
  doc.text("Exchange Rate:", margin, y)
  doc.text(`1 ${data.sourceCurrency} = ${data.exchangeRate.toFixed(4)} ${data.targetCurrency}`, pageWidth - margin, y, { align: "right" })
  y += 5

  y += 2
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Total (USD):", margin, y)
  doc.text(`$${data.totalAmount.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 6

  y += 2
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("Thank you for your business!", pageWidth / 2, y, { align: "center" })
  y += 4
  doc.text("Please retain this receipt for your records.", pageWidth / 2, y, { align: "center" })
  y += 4
  doc.text("Questions? Contact us with your transaction #", pageWidth / 2, y, { align: "center" })

  doc.save(`receipt-${data.transactionNumber}.pdf`)
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency
}
