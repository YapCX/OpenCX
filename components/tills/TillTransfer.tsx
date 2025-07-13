"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw
} from "lucide-react";

interface TransferItem {
  currencyCode: string;
  amount: number;
}

export function TillTransfer() {
  const [sourceTillId, setSourceTillId] = useState<string>("");
  const [destinationTillId, setDestinationTillId] = useState<string>("");
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const tills = useQuery(api.tills.list, {}) || [];
  const sourceTillBalances = useQuery(
    api.transactions.getTillBalances,
    sourceTillId ? { tillId: sourceTillId } : "skip"
  ) || [];
  const destinationTillBalances = useQuery(
    api.transactions.getTillBalances,
    destinationTillId ? { tillId: destinationTillId } : "skip"
  ) || [];
  // Removed unused currencies query

  // Mutations
  const createTransfer = useMutation(api.transactions.createTillTransfer);

  // Initialize transfers when tills are selected
  useEffect(() => {
    if (sourceTillId && destinationTillId && destinationTillBalances.length > 0) {
      const initialTransfers = destinationTillBalances.map(balance => ({
        currencyCode: balance.currencyCode,
        amount: 0
      }));
      setTransfers(initialTransfers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTillId, destinationTillId, destinationTillBalances.length]);

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currency}`;
  };

  const updateTransferAmount = (currencyCode: string, amount: number) => {
    setTransfers(transfers.map(t => 
      t.currencyCode === currencyCode ? { ...t, amount } : t
    ));
  };

  const getSourceBalance = (currencyCode: string) => {
    return sourceTillBalances.find(b => b.currencyCode === currencyCode)?.balance || 0;
  };

  const getDestinationBalance = (currencyCode: string) => {
    return destinationTillBalances.find(b => b.currencyCode === currencyCode)?.balance || 0;
  };

  const getNewDestinationBalance = (currencyCode: string) => {
    const transfer = transfers.find(t => t.currencyCode === currencyCode);
    const currentBalance = getDestinationBalance(currencyCode);
    return currentBalance + (transfer?.amount || 0);
  };

  const getNewSourceBalance = (currencyCode: string) => {
    const transfer = transfers.find(t => t.currencyCode === currencyCode);
    const currentBalance = getSourceBalance(currencyCode);
    return currentBalance - (transfer?.amount || 0);
  };

  const swapTills = () => {
    const tempSourceId = sourceTillId;
    setSourceTillId(destinationTillId);
    setDestinationTillId(tempSourceId);
    // Reset transfers when swapping
    setTransfers(transfers.map(t => ({ ...t, amount: 0 })));
  };

  const isValidTransfer = () => {
    if (!sourceTillId || !destinationTillId || sourceTillId === destinationTillId) {
      return false;
    }

    // Check if any transfer amounts are non-zero
    const hasTransfers = transfers.some(t => t.amount > 0);
    if (!hasTransfers) return false;

    // Check if source has sufficient balance for all positive transfers
    return transfers.every(transfer => {
      if (transfer.amount === 0) return true;
      return getSourceBalance(transfer.currencyCode) >= transfer.amount;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidTransfer()) {
      toast.error("Please check your transfer amounts and balances");
      return;
    }

    const positiveTransfers = transfers.filter(t => t.amount > 0);
    if (positiveTransfers.length === 0) {
      toast.error("Please enter at least one transfer amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTransfer({
        sourceTillId,
        destinationTillId,
        transfers: positiveTransfers,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        toast.success(`Till transfer completed successfully (${result.transactionId})`);
        
        // Reset form
        setTransfers(transfers.map(t => ({ ...t, amount: 0 })));
        setNotes("");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to complete transfer";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTills = tills.filter(t => t.isActive);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Till Selection */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Till</CardTitle>
                <CardDescription>Till to transfer funds from</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={sourceTillId} onValueChange={setSourceTillId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source till" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTills.map((till) => (
                      <SelectItem 
                        key={till.tillId} 
                        value={till.tillId}
                        disabled={till.tillId === destinationTillId}
                      >
                        {till.tillId} - {till.tillName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swapTills}
              disabled={!sourceTillId || !destinationTillId}
              className="h-10 w-10"
              title="Swap source and destination"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Destination Till</CardTitle>
                <CardDescription>Till to receive the funds</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={destinationTillId} onValueChange={setDestinationTillId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination till" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTills.map((till) => (
                      <SelectItem 
                        key={till.tillId} 
                        value={till.tillId}
                        disabled={till.tillId === sourceTillId}
                      >
                        {till.tillId} - {till.tillName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transfer Amounts */}
        {sourceTillId && destinationTillId && transfers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Transfer Amounts
              </CardTitle>
              <CardDescription>
                Enter amounts to transfer from source to destination till
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const availableTransfers = transfers.filter(transfer => 
                  getSourceBalance(transfer.currencyCode) > 0
                );
                
                if (availableTransfers.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No funds available to transfer from the selected source till.</p>
                      <p className="text-xs mt-1">Select a different source till with available balances.</p>
                    </div>
                  );
                }
                
                return transfers.map((transfer, index) => {
                const sourceBalance = getSourceBalance(transfer.currencyCode);
                const destinationBalance = getDestinationBalance(transfer.currencyCode);
                const newSourceBalance = getNewSourceBalance(transfer.currencyCode);
                const newDestinationBalance = getNewDestinationBalance(transfer.currencyCode);
                const isInvalid = transfer.amount > 0 && sourceBalance < transfer.amount;

                if (sourceBalance <= 0) {
                  return null;
                }

                return (
                  <div key={`${transfer.currencyCode}-${index}`} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        {transfer.currencyCode}
                      </Label>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Source Current Balance */}
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Source</div>
                        <div className="font-mono text-sm">
                          {formatCurrency(sourceBalance, transfer.currencyCode)}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="col-span-1 text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </div>

                      {/* Transfer Amount Input */}
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={transfer.amount || ""}
                          onChange={(e) => updateTransferAmount(
                            transfer.currencyCode, 
                            Math.max(0, parseFloat(e.target.value) || 0)
                          )}
                          className={`font-mono text-center ${isInvalid ? 'border-red-500' : ''}`}
                        />
                      </div>

                      {/* Arrow */}
                      <div className="col-span-1 text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </div>

                      {/* Destination Current Balance */}
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Destination</div>
                        <div className="font-mono text-sm">
                          {formatCurrency(destinationBalance, transfer.currencyCode)}
                        </div>
                      </div>

                      {/* Equals */}
                      <div className="col-span-1 text-center">
                        <span className="text-muted-foreground">=</span>
                      </div>

                      {/* New Balances */}
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground mb-1">New Balances</div>
                        <div className={`font-mono text-xs space-y-1`}>
                          <div className={newSourceBalance < 0 ? 'text-red-600' : ''}>
                            S: {formatCurrency(newSourceBalance, transfer.currencyCode)}
                          </div>
                          <div>
                            D: {formatCurrency(newDestinationBalance, transfer.currencyCode)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isInvalid && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          Insufficient funds - Available: {formatCurrency(sourceBalance, transfer.currencyCode)}
                        </span>
                      </div>
                    )}

                    <Separator />
                  </div>
                );
              });
              })()}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {sourceTillId && destinationTillId && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Notes</CardTitle>
              <CardDescription>Optional notes for this transfer</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any notes about this transfer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        {sourceTillId && destinationTillId && (
          <Card>
            <CardContent className="pt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Transfer Instructions</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Enter amounts to transfer FROM source TO destination till</li>
                      <li>• Use the swap button to reverse the transfer direction</li>
                      <li>• All transfers are recorded as internal transactions</li>
                      <li>• Balances are updated immediately upon completion</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {sourceTillId && destinationTillId && (
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!isValidTransfer() || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Execute Transfer
                </>
              )}
            </Button>

            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setTransfers(transfers.map(t => ({ ...t, amount: 0 })));
                setNotes("");
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}