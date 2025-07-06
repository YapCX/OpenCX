"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Check,
  Upload,
  ExternalLink,
  Plus,
  Coins,
  Banknote,
  ArrowLeft
} from "lucide-react";

interface DenominationFormProps {
  editingId?: Id<"denominations"> | null;
  onClose: () => void;
  isOpen: boolean;
}

export function DenominationForm({ editingId, onClose, isOpen }: DenominationFormProps) {
  const [currencyCode, setCurrencyCode] = useState("");
  const [value, setValue] = useState("");
  const [isCoin, setIsCoin] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sessionDenominations, setSessionDenominations] = useState<Array<{value: number, isCoin: boolean}>>([]);
  const [currencyValid, setCurrencyValid] = useState<boolean | null>(null);

  const valueInputRef = useRef<HTMLInputElement>(null);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingDenomination = useQuery(
    api.denominations.get,
    editingId ? { id: editingId } : "skip"
  );

  const currencyVerification = useQuery(
    api.denominations.verifyCurrency,
    currencyCode ? { code: currencyCode } : "skip"
  );

  const createDenomination = useMutation(api.denominations.create);
  const updateDenomination = useMutation(api.denominations.update);
  const generateUploadUrl = useMutation(api.denominations.generateUploadUrl);

  useEffect(() => {
    if (existingDenomination) {
      setCurrencyCode(existingDenomination.currencyCode);
      setValue(existingDenomination.value.toString());
      setIsCoin(existingDenomination.isCoin);
      if (existingDenomination.imageUrl) {
        setImagePreview(existingDenomination.imageUrl);
      }
    }
  }, [existingDenomination]);

  useEffect(() => {
    if (currencyVerification) {
      setCurrencyValid(currencyVerification.exists);
    }
  }, [currencyVerification]);

  // Handle paste events for image
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            toast.success("Image pasted successfully");
          }
        }
      }
    };

    const imageArea = imageAreaRef.current;
    if (imageArea) {
      imageArea.addEventListener('paste', handlePaste);
      return () => imageArea.removeEventListener('paste', handlePaste);
    }
  }, []);

  const handleValueKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !editingId) {
      e.preventDefault();
      await handleQuickAdd();
    }
  };

  const handleQuickAdd = async () => {
    if (!currencyCode || !value || !currencyValid) {
      toast.error("Please enter a valid currency code and value");
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    try {
      let imageId: Id<"_storage"> | undefined;

      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });

        if (result.ok) {
          const json = await result.json();
          imageId = json.storageId;
        }
      }

      await createDenomination({
        currencyCode,
        value: numValue,
        isCoin,
        imageId,
      });

      // Add to session list
      setSessionDenominations(prev => [...prev, { value: numValue, isCoin }]);

      // Clear form for next entry
      setValue("");
      setIsCoin(false);
      setImageFile(null);
      setImagePreview(null);

      // Focus back to value input
      valueInputRef.current?.focus();

      toast.success(`Added ${isCoin ? "coin" : "bill"} ${numValue} for ${currencyCode}`);
    } catch {
      toast.error("Failed to add denomination");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currencyCode || !value || !currencyValid) {
      toast.error("Please enter a valid currency code and value");
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    try {
      let imageId: Id<"_storage"> | undefined;

      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });

        if (result.ok) {
          const json = await result.json();
          imageId = json.storageId;
        }
      } else if (existingDenomination?.imageId) {
        imageId = existingDenomination.imageId;
      }

      if (editingId) {
        await updateDenomination({
          id: editingId,
          currencyCode,
          value: numValue,
          isCoin,
          imageId,
        });
        toast.success("Denomination updated successfully");
      } else {
        await createDenomination({
          currencyCode,
          value: numValue,
          isCoin,
          imageId,
        });
        toast.success("Denomination created successfully");
      }

      onClose();
    } catch {
      toast.error("Failed to save denomination");
    }
  };

  const handleWikipediaLookup = () => {
    const query = `${currencyCode} currency denominations`;
    window.open(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`, '_blank');
  };

  const handleImageAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6" />
              {editingId ? "Edit Denomination" : "Add Denomination"}
            </h1>
            <p className="text-muted-foreground">
              {editingId ? "Update denomination details" : "Create a new currency denomination"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Form */}
          <Card>
            <CardHeader>
              <CardTitle>Denomination Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Currency Code */}
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="currencyCode"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    placeholder="USD"
                    maxLength={3}
                    disabled={!!editingId}
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleWikipediaLookup}
                    disabled={!currencyCode}
                    title="Look up currency on Wikipedia"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {currencyCode && (
                  <div className="flex items-center gap-2 text-sm">
                    {currencyValid === true && (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Valid currency</span>
                      </>
                    )}
                    {currencyValid === false && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Currency not found</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  ref={valueInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleValueKeyDown}
                  placeholder="1.00"
                />
                {!editingId && (
                  <p className="text-xs text-muted-foreground">
                    Press Enter to quickly add and continue
                  </p>
                )}
              </div>

              {/* Type Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="type">Type</Label>
                  <div className="text-sm text-muted-foreground">
                    {isCoin ? "Coin" : "Bill/Note"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-500" />
                  <Switch
                    id="type"
                    checked={isCoin}
                    onCheckedChange={setIsCoin}
                  />
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Image (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={imageAreaRef}
                onClick={handleImageAreaClick}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                tabIndex={0}
              >
                {imagePreview ? (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-32 mx-auto object-contain rounded"
                    />
                    <p className="text-sm text-muted-foreground">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or paste an image
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <p className="text-xs text-muted-foreground">
                Supported formats: PNG, JPG, GIF. Max size: 5MB
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Session Progress */}
        {!editingId && sessionDenominations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Added This Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sessionDenominations.map((denom, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {denom.isCoin ? (
                      <Coins className="h-3 w-3" />
                    ) : (
                      <Banknote className="h-3 w-3" />
                    )}
                    {denom.value} {currencyCode}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!editingId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleQuickAdd}
              disabled={!currencyCode || !value || !currencyValid}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Quick Add & Continue
            </Button>
          )}

          <Button type="submit" disabled={!currencyCode || !value || !currencyValid}>
            {editingId ? "Update Denomination" : "Create Denomination"}
          </Button>

          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}