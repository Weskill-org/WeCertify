import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImageUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractCertificateId } from "@/lib/qr";

type QrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (certificateId: string) => void;
};

export function QrScannerDialog({ open, onOpenChange, onDetected }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "unavailable">("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("starting");
    setMessage(null);

    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelled || !videoRef.current) return;

        const scanner = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            const id = extractCertificateId(result.data);
            if (!id) {
              setMessage("That QR code doesn't contain a certificate ID.");
              return;
            }
            scanner.stop();
            onDetected(id);
          },
          { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
        );
        scannerRef.current = scanner;
        await scanner.start();
        if (!cancelled) setStatus("scanning");
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setMessage("We couldn't access a camera. You can upload a QR image instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [open, onDetected]);

  async function handleFile(file: File) {
    setDecoding(true);
    setMessage(null);
    try {
      const { default: QrScanner } = await import("qr-scanner");
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const id = extractCertificateId(result.data);
      if (!id) {
        setMessage("No certificate ID found in that image.");
        return;
      }
      onDetected(id);
    } catch {
      setMessage("We couldn't read a QR code in that image. Try a clearer photo.");
    } finally {
      setDecoding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Scan certificate QR</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code printed on the Weskill certificate.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-primary/95">
          <video
            ref={videoRef}
            className="size-full object-cover"
            playsInline
            muted
            aria-label="QR code camera preview"
          />

          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-gold/70">
              <div className="animate-scanline h-0.5 w-full bg-gold shadow-gold" />
            </div>
          )}

          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-primary-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {status === "unavailable" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-primary-foreground">
              <CameraOff className="size-7 text-gold" />
              <p className="text-sm text-primary-foreground/80">Camera not available</p>
            </div>
          )}
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={decoding}
          >
            {decoding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageUp className="size-4" />
            )}
            Upload QR image
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
            <Camera className="size-4" />
            Enter ID manually
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
