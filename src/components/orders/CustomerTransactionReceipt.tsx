import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrencySymbols } from "../../hooks/useCurrency";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Receipt,
  Printer,
  Download,
  X,
  Building2,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Hash
} from "lucide-react";

interface CustomerTransactionReceiptProps {
  transactionId: string;
  onClose: () => void;
  isOpen?: boolean;
}

export function CustomerTransactionReceipt({ transactionId, onClose, isOpen = true }: CustomerTransactionReceiptProps) {
  const transaction = useQuery(api.customerTransactions.getByTransactionId, { transactionId });
  const customer = useQuery(
    api.customers.get,
    transaction?.customerId ? { id: transaction.customerId } : "skip"
  );
  const { formatCurrency } = useCurrencySymbols();
  const [printing, setPrinting] = useState(false);

  if (!transaction) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Transaction</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p>Loading transaction...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handlePrint = async () => {
    setPrinting(true);
    try {
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleDownload = () => {
    // Create a receipt text version
    const receiptText = generateReceiptText();
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${transaction._id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    return `
CURRENCY EXCHANGE RECEIPT
========================

Transaction ID: ${transaction._id}
Date: ${new Date(transaction._creationTime).toLocaleString()}
Customer: ${customer?.fullName || customer?.legalBusinessName || 'Unknown'}
Type: ${transaction.type}

Exchange Details:
Foreign Currency: ${transaction.foreignCurrency}
Foreign Amount: ${formatCurrency(transaction.foreignAmount, transaction.foreignCurrency)}
Local Currency: ${transaction.localCurrency}
Local Amount: ${formatCurrency(transaction.localAmount, transaction.localCurrency)}
Exchange Rate: ${transaction.exchangeRate}
Service Fee: ${formatCurrency(transaction.flatFee, transaction.localCurrency)}
Payment Method: ${transaction.paymentMethod}

Thank you for your business!
`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Currency Exchange Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">OpenCX</h2>
            </div>
            <p className="text-sm text-muted-foreground">Currency Exchange Services</p>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Transaction ID
                </div>
                <p className="font-mono text-sm">{transaction._id}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Date & Time
                </div>
                <p className="text-sm">{new Date(transaction._creationTime).toLocaleString()}</p>
              </div>
            </div>

            {customer && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Customer
                </div>
                <p className="text-sm font-medium">
                  {customer.fullName || customer.legalBusinessName || 'Unknown Customer'}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Transaction Type
              </div>
              <Badge variant="secondary" className="text-sm">
                {transaction.type.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Exchange Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Exchange Details</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Foreign Currency</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(transaction.foreignAmount, transaction.foreignCurrency)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Local Currency</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(transaction.localAmount, transaction.localCurrency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span className="ml-2 font-medium">{transaction.exchangeRate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Service Fee:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(transaction.flatFee, transaction.localCurrency)}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="ml-2 font-medium">{transaction.paymentMethod}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center">
            <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
              {transaction.status?.toUpperCase() || "PENDING"}
            </Badge>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Thank you for your business!</p>
            <p>For questions, please contact support.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Printing..." : "Print"}
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}