import { useState, useEffect } from "react";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// Icons
import { Search } from "lucide-react";

interface SearchDialogProps {
  onSearch: (term: string) => void;
  onClose: () => void;
  currentSearch: string;
}

export function SearchDialog({ onSearch, onClose, currentSearch }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    // Focus the input when dialog opens
    const input = document.getElementById("search-input");
    if (input) {
      input.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Currency
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-input">Search Term</Label>
            <Input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter code, name, or country..."
            />
            <p className="text-xs text-muted-foreground">
              Search across currency code, name, and country
            </p>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="submit" className="flex-1">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
