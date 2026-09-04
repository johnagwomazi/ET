import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Camera permission was denied";
  }

  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "No camera was found on this device";
  }

  if (!window.isSecureContext) {
    return "Camera access requires HTTPS or localhost";
  }

  return "The camera could not be started";
}

function TicketScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [cameraError, setCameraError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let disposed = false;

    handledRef.current = false;
    setCameraError("");
    setIsStarting(true);

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera scanning is not supported by this browser");
        setIsStarting(false);
        return;
      }

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");

        if (disposed) {
          return;
        }

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 180,
          delayBetweenScanSuccess: 800,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || handledRef.current || disposed) {
              return;
            }

            handledRef.current = true;
            controlsRef.current?.stop();
            onDetectedRef.current?.(result.getText());
          }
        );

        if (disposed) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
      } catch (error) {
        if (!disposed) {
          setCameraError(getCameraErrorMessage(error));
        }
      } finally {
        if (!disposed) {
          setIsStarting(false);
        }
      }
    }

    startScanner();

    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;

      const stream = videoRef.current?.srcObject;
      stream?.getTracks?.().forEach((track) => track.stop());
    };
  }, [open, restartKey]);

  function handleRetry() {
    controlsRef.current?.stop();
    setRestartKey((current) => current + 1);
  }

  return (
    <Modal
      open={open}
      title="Scan ticket QR"
      onClose={onClose}
      className="max-w-xl"
      footer={
        cameraError ? (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleRetry}>
              <Camera className="h-4 w-4" />
              Retry camera
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
            <div className="relative aspect-square w-[68%] max-w-64 rounded-lg border-2 border-white/85 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]">
              <ScanLine className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/70" />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="min-h-6 text-center text-sm">
          {cameraError ? (
            <div className="space-y-1">
              <p className="text-rose-300">{cameraError}</p>
              <p className="text-slate-400">Close the scanner and enter the ticket reference manually.</p>
            </div>
          ) : (
            <p className="text-slate-400">{isStarting ? "Starting camera..." : "Camera ready"}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TicketScannerModal;
