"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  ArrowLeft,
  Lock,
  Share2,
  CheckCircle,
  Info
} from "lucide-react";

interface TillFormProps {
  editingId?: Id<"tills"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function TillForm({ editingId, onClose, isOpen }: TillFormProps) {
  const [tillId, setTillId] = useState("");
  const [tillName, setTillName] = useState("");
  const [reserveForAdmin, setReserveForAdmin] = useState(false);
  const [shareTill, setShareTill] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const existingTill = useQuery(
    api.tills.list,
    {}
  )?.find(t => t._id === editingId);

  const currencies = useQuery(api.currencies.list, {}) || [];

  const createTill = useMutation(api.tills.create);
  const updateTill = useMutation(api.tills.update);

  useEffect(() => {
    if (existingTill) {
      setTillId(existingTill.tillId);
      setTillName(existingTill.tillName);
      setReserveForAdmin(existingTill.reserveForAdmin);
      setShareTill(existingTill.shareTill);
      setIsActive(existingTill.isActive);
    }
  }, [existingTill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tillId || !tillName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingId) {
        await updateTill({
          id: editingId,
          tillName,
          reserveForAdmin,
          shareTill,
          isActive,
        });
        toast.success("Till updated successfully");
      } else {
        await createTill({
          tillId: tillId.toUpperCase(),
          tillName,
          reserveForAdmin,
          shareTill,
        });
        toast.success("Till created successfully");
      }

      onClose();
    } catch {
      toast.error("Failed to save till");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {editingId ? "Edit Till" : "Add Till"}
          </h1>
          <p className="text-muted-foreground">
            {editingId ? "Update till configuration" : "Create a new cash register"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Till ID */}
              <div className="space-y-2">
                <Label htmlFor="tillId">Till ID *</Label>
                <Input
                  id="tillId"
                  value={tillId}
                  onChange={(e) => setTillId(e.target.value.toUpperCase())}
                  placeholder="01"
                  maxLength={10}
                  disabled={!!editingId}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the till (e.g., 01, 02, FRONT)
                </p>
              </div>

              {/* Till Name */}
              <div className="space-y-2">
                <Label htmlFor="tillName">Till Name *</Label>
                <Input
                  id="tillName"
                  value={tillName}
                  onChange={(e) => setTillName(e.target.value)}
                  placeholder="Front Desk Till"
                />
                <p className="text-xs text-muted-foreground">
                  Descriptive name for the till
                </p>
              </div>

              {/* Active Status (only for editing) */}
              {editingId && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Active Status</Label>
                    <div className="text-sm text-muted-foreground">
                      {isActive ? "Till is active and can be used" : "Till is disabled"}
                    </div>
                  </div>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Admin Only */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reserveForAdmin" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Reserve for Admin
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Only administrators can access this till
                  </div>
                </div>
                <Switch
                  id="reserveForAdmin"
                  checked={reserveForAdmin}
                  onCheckedChange={setReserveForAdmin}
                />
              </div>

              <Separator />

              {/* Shared Till */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="shareTill" className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Shared Till
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Allow multiple users to access simultaneously
                  </div>
                </div>
                <Switch
                  id="shareTill"
                  checked={shareTill}
                  onCheckedChange={setShareTill}
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Access Control Settings</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• Admin-only tills restrict access to administrators</li>
                      <li>• Shared tills allow multiple users to sign in simultaneously</li>
                      <li>• Non-shared tills can only have one user at a time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Accounts Setup Info */}
        {!editingId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Automatic Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900 mb-1">Cash Accounts Creation</p>
                    <p className="text-green-700">
                      When you create this till, cash ledger accounts will be automatically created 
                      for all {currencies.length} active currencies in your system. Each account 
                      will start with a zero balance.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" disabled={!tillId || !tillName}>
            {editingId ? "Update Till" : "Create Till"}
          </Button>

          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}