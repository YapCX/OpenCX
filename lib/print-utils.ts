import { Id } from "../convex/_generated/dataModel";

export interface TransactionForPrint {
  _id: Id<"transactions">;
  transactionId: string;
  type: string;
  fromCurrency: string;
  fromAmount: number;
  toCurrency: string;
  toAmount: number;
  exchangeRate: number;
  serviceFee?: number;
  serviceFeeType?: string;
  paymentMethod?: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  requiresCompliance: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export function generateTransactionReceipt(transaction: TransactionForPrint): string {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case "currency_buy":
        return "Buy Order";
      case "currency_sell":
        return "Sell Order";
      default:
        return type;
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Transaction Receipt - ${transaction.transactionId}</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .receipt-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .transaction-id {
      font-size: 12px;
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 8px;
      text-decoration: underline;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .label {
      font-weight: bold;
    }
    .value {
      text-align: right;
    }
    .total-section {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 10px 0;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
      border-top: 1px solid #000;
      padding-top: 10px;
    }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid #000;
      margin-top: 5px;
    }
    .aml-notice {
      background-color: #f0f0f0;
      padding: 8px;
      border: 1px solid #000;
      margin-top: 10px;
      font-size: 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">OpenCX</div>
    <div>Currency Exchange Services</div>
    <div class="receipt-title">TRANSACTION RECEIPT</div>
    <div class="transaction-id">Transaction ID: ${transaction.transactionId}</div>
    <div class="status">Status: ${transaction.status.toUpperCase()}</div>
  </div>

  <div class="section">
    <div class="section-title">Transaction Details</div>
    <div class="row">
      <span class="label">Type:</span>
      <span class="value">${getTransactionTypeName(transaction.type)}</span>
    </div>
    <div class="row">
      <span class="label">Date:</span>
      <span class="value">${formatDate(transaction.createdAt)}</span>
    </div>
    ${transaction.paymentMethod ? `
    <div class="row">
      <span class="label">Payment Method:</span>
      <span class="value">${transaction.paymentMethod.replace('_', ' ').toUpperCase()}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Exchange Information</div>
    <div class="row">
      <span class="label">From:</span>
      <span class="value">${formatAmount(transaction.fromAmount)} ${transaction.fromCurrency}</span>
    </div>
    <div class="row">
      <span class="label">To:</span>
      <span class="value">${formatAmount(transaction.toAmount)} ${transaction.toCurrency}</span>
    </div>
    <div class="row">
      <span class="label">Exchange Rate:</span>
      <span class="value">${transaction.exchangeRate.toFixed(6)}</span>
    </div>
    <div class="row">
      <span class="label">Service Fee:</span>
      <span class="value">${formatAmount(transaction.serviceFee || 0)} ${transaction.fromCurrency}</span>
    </div>
  </div>

  <div class="total-section">
    <div class="row">
      <span class="label">Customer ${transaction.type === "currency_buy" ? "Pays" : "Receives"}:</span>
      <span class="value">
        ${transaction.type === "currency_buy" ? 
          `${formatAmount(transaction.fromAmount)} ${transaction.fromCurrency}` :
          `${formatAmount(transaction.toAmount)} ${transaction.toCurrency}`
        }
      </span>
    </div>
    <div class="row">
      <span class="label">Customer ${transaction.type === "currency_buy" ? "Receives" : "Pays"}:</span>
      <span class="value">
        ${transaction.type === "currency_buy" ? 
          `${formatAmount(transaction.toAmount)} ${transaction.toCurrency}` :
          `${formatAmount(transaction.fromAmount)} ${transaction.fromCurrency}`
        }
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="row">
      <span class="label">Name:</span>
      <span class="value">${transaction.customerName || "Walk-in Customer"}</span>
    </div>
    ${transaction.customerEmail ? `
    <div class="row">
      <span class="label">Email:</span>
      <span class="value">${transaction.customerEmail}</span>
    </div>
    ` : ''}
    ${transaction.customerPhone ? `
    <div class="row">
      <span class="label">Phone:</span>
      <span class="value">${transaction.customerPhone}</span>
    </div>
    ` : ''}
    ${transaction.customerId ? `
    <div class="row">
      <span class="label">Customer ID:</span>
      <span class="value">${transaction.customerId}</span>
    </div>
    ` : ''}
  </div>

  ${transaction.requiresCompliance ? `
  <div class="compliance-notice">
    <strong>COMPLIANCE:</strong> This transaction requires compliance verification due to amount exceeding $1,000.
  </div>
  ` : ''}

  ${transaction.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    <div>${transaction.notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div>Thank you for your business!</div>
    <div>This receipt was generated on ${formatDate(Date.now())}</div>
    <div>For inquiries, please reference transaction ID: ${transaction.transactionId}</div>
  </div>
</body>
</html>
  `.trim();
}

export function printTransactionReceipt(transaction: TransactionForPrint): void {
  const receiptHtml = generateTransactionReceipt(transaction);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=600,height=800');
  
  if (!printWindow) {
    alert('Please allow popups to print receipts');
    return;
  }
  
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

export function downloadTransactionReceiptPDF(transaction: TransactionForPrint): void {
  const receiptHtml = generateTransactionReceipt(transaction);
  
  // Create a temporary HTML file and trigger download
  const blob = new Blob([receiptHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `transaction-receipt-${transaction.transactionId}.html`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}