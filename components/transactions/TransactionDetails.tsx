"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  FileText,
  Printer,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import { printTransactionReceipt, downloadTransactionReceiptPDF } from "@/lib/print-utils";
import { EditTransactionForm } from "./EditTransactionForm";

interface TransactionDetailsProps {
  transactionId: Id<"transactions"> | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetails({ transactionId, isOpen, onClose }: TransactionDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [showEditForm, setShowEditForm] = useState(false);

  const transaction = useQuery(
    api.transactions.getById,
    transactionId ? { id: transactionId } : "skip"
  );

  const currentTill = useQuery(api.tills.getCurrentUserTill, {});
  const updateStatus = useMutation(api.transactions.updateStatus);
  const deleteTransaction = useMutation(api.transactions.remove);

  const handleStatusUpdate = async () => {
    if (!transaction || !newStatus) return;

    // Check if completing a transaction requires till access
    if (newStatus === "completed" && transaction.category === "currency_exchange" && !currentTill) {
      toast.error("Please sign into a till to complete currency exchange transactions");
      return;
    }

    setIsUpdating(true);
    try {
      await updateStatus({
        id: transaction._id,
        status: newStatus as "pending" | "processing" | "completed" | "failed" | "cancelled",
        tillId: currentTill?.tillId
      });
      toast.success(`Transaction ${newStatus}${newStatus === "completed" ? " and till balances updated" : ""}`);
      setNewStatus("");
    } catch {
      toast.error("Failed to update transaction status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction({ id: transaction._id });
        toast.success('Transaction deleted');
        onClose();
      } catch {
        toast.error('Failed to delete transaction');
      }
    }
  };

  const handlePrint = () => {
    if (!transaction) return;
    try {
      printTransactionReceipt(transaction);
    } catch {
      toast.error("Failed to print receipt");
    }
  };

  const handleDownloadPDF = () => {
    if (!transaction) return;
    try {
      downloadTransactionReceiptPDF(transaction);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to download receipt");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "currency_buy":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "currency_sell":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!transaction) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Loading transaction details...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transaction Details
          </DialogTitle>
          <DialogDescription>
            View and manage transaction {transaction.transactionId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Status and Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction Status</span>
                <Badge className={getStatusColor(transaction.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(transaction.status)}
                    {transaction.status}
                  </div>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || isUpdating}
                  size="sm"
                >
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                    <p className="font-mono text-sm">{transaction.transactionId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(transaction.type)}
                      <span className="capitalize">
                        {transaction.type.replace("currency_", "")}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Exchange</label>
                  <p className="font-mono">
                    {transaction.fromCurrency} → {transaction.toCurrency}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">From Amount</label>
                    <p className="font-mono">
                      {formatAmount(transaction.fromAmount)} {transaction.fromCurrency}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">To Amount</label>
                    <p className="font-mono">
                      {formatAmount(transaction.toAmount)} {transaction.toCurrency}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Exchange Rate</label>
                    <p className="font-mono">{transaction.exchangeRate.toFixed(6)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Fee</label>
                    <p className="font-mono">
                      {formatAmount(transaction.serviceFee || 0)} {transaction.fromCurrency}
                    </p>
                  </div>
                </div>

                {transaction.paymentMethod && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <p className="capitalize">{transaction.paymentMethod.replace("_", " ")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                  <p>{transaction.customerName || "Walk-in"}</p>
                </div>

                {transaction.customerEmail && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{transaction.customerEmail}</p>
                  </div>
                )}

                {transaction.customerPhone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p>{transaction.customerPhone}</p>
                  </div>
                )}

                {transaction.customerId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                    <p className="font-mono">{transaction.customerId}</p>
                  </div>
                )}

                {transaction.requiresAML && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">AML Compliance Required</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Transaction Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Customer {transaction.type === "currency_buy" ? "Pays" : "Receives"}:</span>
                  <span className="font-mono font-semibold">
                    {transaction.type === "currency_buy" ? 
                      `${formatAmount(transaction.fromAmount)} ${transaction.fromCurrency}` :
                      `${formatAmount(transaction.toAmount)} ${transaction.toCurrency}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customer {transaction.type === "currency_buy" ? "Receives" : "Pays"}:</span>
                  <span className="font-mono font-semibold">
                    {transaction.type === "currency_buy" ? 
                      `${formatAmount(transaction.toAmount)} ${transaction.toCurrency}` :
                      `${formatAmount(transaction.fromAmount)} ${transaction.fromCurrency}`
                    }
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span className="font-mono">{transaction.exchangeRate.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span className="font-mono">
                    {formatAmount(transaction.serviceFee || 0)} {transaction.fromCurrency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Transaction Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>

              {transaction.updatedAt > transaction.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.updatedAt)}
                    </p>
                  </div>
                </div>
              )}

              {transaction.completedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Transaction Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.completedAt)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {transaction.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {transaction.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {transaction.status === "pending" && (
                <Button variant="outline" onClick={() => setShowEditForm(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(transaction.status === "pending" || transaction.status === "failed") && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Edit Transaction Form */}
      <EditTransactionForm
        transactionId={transactionId}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={() => {
          setShowEditForm(false);
          // Refresh transaction data by re-fetching
        }}
      />
    </Dialog>
  );
}