"use client";

import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Id } from "../../convex/_generated/dataModel";

interface OrderFormProps {
  editingId?: Id<"transactions"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function OrderForm({ editingId, onClose, isOpen }: OrderFormProps) {
  return (
    <TransactionForm
      editingId={editingId}
      onClose={onClose}
      isOpen={isOpen}
    />
  );
}