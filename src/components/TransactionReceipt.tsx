import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { formatCurrency } from "../lib/utils";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
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

interface TransactionReceiptProps {
  transactionId: Id<"transactions">;
  onClose: () => void;
}

export function TransactionReceipt({ transactionId, onClose }: TransactionReceiptProps) {
  const transaction = useQuery(api.transactions.get, { id: transactionId });
  const customer = useQuery(
    api.customers.get,
    transaction?.customerId ? { id: transaction.customerId } : "skip"
  );
  const [printing, setPrinting] = useState(false);

  if (!transaction) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p>Loading transaction...</p>
          </CardContent>
        </Card>
      </div>
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
TRANSACTION RECEIPT
==================

Transaction ID: ${transaction._id}
Date: ${new Date(transaction._creationTime).toLocaleString()}
Customer: ${customer?.firstName} ${customer?.lastName}
Type: ${transaction.type}
Amount: ${formatCurrency(transaction.amount, transaction.currency || "USD")}

Details:
${transaction.details ? JSON.stringify(transaction.details, null, 2) : "N/A"}

Thank you for your business!
`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction Receipt
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
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
                  {customer.firstName} {customer.lastName}
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

          {/* Amount */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4" />
              Amount
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(transaction.amount, transaction.currency || "USD")}
            </p>
          </div>

          {/* Transaction Details */}
          {transaction.details && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Transaction Details</h4>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-sm space-y-2">
                    {Object.entries(transaction.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
