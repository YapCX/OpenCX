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
  Hash,
  FileText
} from "lucide-react";

interface TillTransactionReceiptProps {
  transactionId: string;
  onClose: () => void;
  isOpen?: boolean;
}

export function TillTransactionReceipt({ transactionId, onClose, isOpen = true }: TillTransactionReceiptProps) {
  const transaction = useQuery(api.tillTransactions.getByTransactionId, { transactionId });
  const [printing, setPrinting] = useState(false);
  const { formatCurrency } = useCurrencySymbols();

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
    link.download = `till-receipt-${transaction.transactionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    return `
TILL TRANSACTION RECEIPT
========================

Transaction ID: ${transaction.transactionId}
Date: ${new Date(transaction._creationTime).toLocaleString()}
Operator: ${transaction.user?.name || "Unknown"}
Till: ${transaction.tillId}
Type: ${transaction.type.replace("_", " ").toUpperCase()}

Transaction Details:
Currency: ${transaction.currency}
Amount: ${formatCurrency(transaction.amount, transaction.currency)}
Status: ${transaction.status || "COMPLETED"}

${transaction.notes ? `Notes: ${transaction.notes}` : ""}

Internal Transaction - For Till Management Only
`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Till Transaction Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">OpenCX</h2>
            </div>
            <p className="text-sm text-muted-foreground">Till Management System</p>
            <Badge variant="outline" className="text-xs">
              Internal Transaction
            </Badge>
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
                <p className="font-mono text-sm">{transaction.transactionId}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Date & Time
                </div>
                <p className="text-sm">{new Date(transaction._creationTime).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Operator
                </div>
                <p className="text-sm font-medium">
                  {transaction.user?.name || "Unknown User"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Till ID
                </div>
                <p className="text-sm font-medium">
                  {transaction.tillId}
                </p>
              </div>
            </div>

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

          {/* Amount */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4" />
              Amount
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(transaction.amount, transaction.currency)}
            </p>
            <div className="text-sm text-muted-foreground">
              Currency: {transaction.currency}
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Notes
                </div>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-sm">
                    {transaction.notes}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Status */}
          <div className="flex items-center justify-center">
            <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
              {transaction.status?.toUpperCase() || "COMPLETED"}
            </Badge>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Internal Till Transaction</p>
            <p>For record keeping and audit purposes</p>
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