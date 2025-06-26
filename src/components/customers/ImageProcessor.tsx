import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// shadcn/ui components
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Slider } from "../ui/slider";
import { Badge } from "../ui/badge";

interface ImageProcessorProps {
  imageUrl: string;
  originalFile: File;
  onProcessed: (blob: Blob, fileName: string) => void;
  onCancel: () => void;
}

export function ImageProcessor({ imageUrl, originalFile, onProcessed, onCancel }: ImageProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [quality, setQuality] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });

      // Set canvas size
      canvas.width = Math.min(img.width, 800);
      canvas.height = Math.min(img.height, 600);

      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw crop overlay
      drawCropOverlay(ctx, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl, crop, zoom]);

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clear crop area
    const cropX = (crop.x / 100) * canvasWidth;
    const cropY = (crop.y / 100) * canvasHeight;
    const cropWidth = (crop.width / 100) * canvasWidth;
    const cropHeight = (crop.height / 100) * canvasHeight;

    ctx.clearRect(cropX, cropY, cropWidth, cropHeight);

    // Redraw image in crop area
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        cropX, cropY, cropWidth, cropHeight
      );

      // Draw crop border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
    };
    img.src = imageUrl;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.width, prev.x + (deltaX / 8))),
      y: Math.max(0, Math.min(100 - prev.height, prev.y + (deltaY / 8))),
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const processImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Create a new canvas for the cropped image
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) return;

      const img = new Image();
      img.onload = () => {
        // Calculate crop dimensions
        const cropX = (crop.x / 100) * img.width;
        const cropY = (crop.y / 100) * img.height;
        const cropWidth = (crop.width / 100) * img.width;
        const cropHeight = (crop.height / 100) * img.height;

        // Set crop canvas size
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;

        // Draw cropped image
        cropCtx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        // Convert to blob with compression
        cropCanvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = `${originalFile.name.split('.')[0]}_processed.jpg`;
              onProcessed(blob, fileName);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = imageUrl;
    } catch (error) {
      toast.error("Failed to process image");
    }
  };

  const resetCrop = () => {
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    setZoom(1);
  };

  const getFileSizeEstimate = () => {
    const originalSize = originalFile.size;
    const compressionRatio = quality;
    const cropRatio = (crop.width / 100) * (crop.height / 100);
    const estimatedSize = originalSize * compressionRatio * cropRatio;

    return (estimatedSize / 1024).toFixed(1) + " KB";
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Process ID Image</DialogTitle>
          <DialogDescription>
            Crop, adjust quality, and process the ID document image
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Canvas */}
          <div className="lg:col-span-2">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-auto cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>• Click and drag to move the crop area</p>
              <p>• Use the controls on the right to adjust crop size and quality</p>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crop Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Width: <Badge variant="outline">{crop.width}%</Badge>
                  </Label>
                  <Slider
                    value={[crop.width]}
                    onValueChange={(value) => setCrop(prev => ({ ...prev, width: value[0] }))}
                    min={10}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Height: <Badge variant="outline">{crop.height}%</Badge>
                  </Label>
                  <Slider
                    value={[crop.height]}
                    onValueChange={(value) => setCrop(prev => ({ ...prev, height: value[0] }))}
                    min={10}
                    max={100}
                    step={1}
                  />
                </div>

                <Button
                  onClick={resetCrop}
                  variant="outline"
                  className="w-full"
                >
                  Reset Crop
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compression</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>
                    Quality: <Badge variant="outline">{Math.round(quality * 100)}%</Badge>
                  </Label>
                  <Slider
                    value={[quality]}
                    onValueChange={(value) => setQuality(value[0])}
                    min={0.1}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estimated size: {getFileSizeEstimate()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Original: {originalFile.name}</div>
                <div>Size: {(originalFile.size / 1024).toFixed(1)} KB</div>
                <div>Type: {originalFile.type}</div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={processImage}
                className="w-full"
              >
                Process & Upload
              </Button>

              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
