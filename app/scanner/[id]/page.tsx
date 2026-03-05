"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { validateTicket, ValidatePayload, ValidateResponse } from "@/lib/api/scan";
import axios from "axios";

export default function ScannerPage() {
    const params = useParams();
    const router = useRouter();

    const [isScanning, setIsScanning] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [hasFlash, setHasFlash] = useState(false);

    // Validation State
    const [scannedTicket, setScannedTicket] = useState<ValidateResponse['data']['info'] | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    // Mock ID display for demo
    const eventIdParam = params?.id;

    // Use a ref for lastScanned to be accessible inside the animation loop closure
    const lastScannedRef = useRef<string>("");

    // Session Data
    const [sessionEvent, setSessionEvent] = useState<{ id: number; scanner_key: string } | null>(null);
    const sessionEventRef = useRef<{ id: number; scanner_key: string } | null>(null);

    useEffect(() => {
        sessionEventRef.current = sessionEvent;
    }, [sessionEvent]);

    useEffect(() => {
        const storedEvent = sessionStorage.getItem("event_data");
        if (storedEvent) {
            try {
                setSessionEvent(JSON.parse(storedEvent));
            } catch (e) {
                console.error("Failed to parse event data", e);
                router.push("/");
            }
        } else {
            router.push("/");
        }
    }, [router]);

    const { mutate: validate, isPending } = useMutation({
        mutationFn: (payload: ValidatePayload) => validateTicket(payload),
        onSuccess: (data) => {
            if (data.status) {
                setScannedTicket(data.data.info);
                setShowSuccessModal(true);
                // Play success sound logic could go here
            } else {
                toast.error("Ticket invalid or already used");
            }
        },
        onError: (error) => {
            console.error(error);
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Validation failed");
            }
            // Clear last scanned so they can try again immediately if it was a read error
            lastScannedRef.current = "";
        },
    });

    // State refs for animation loop
    const isPendingRef = useRef(false);
    const showSuccessModalRef = useRef(false);

    // Sync refs with state
    useEffect(() => {
        isPendingRef.current = isPending;
    }, [isPending]);

    useEffect(() => {
        showSuccessModalRef.current = showSuccessModal;
    }, [showSuccessModal]);


    // Validation for Camera Scans: Must contain '/' to be considered a valid ticket link structure
    // REMOVED per user request


    useEffect(() => {
        let stream: MediaStream | null = null;
        let animationFrameId: number;

        const startCamera = async () => {
            if (!cameraEnabled) return;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.error("Play error:", e));
                        requestAnimationFrame(tick);
                    };

                    const track = stream.getVideoTracks()[0];
                    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                    // @ts-expect-error torch might not be in types
                    if (capabilities.torch) {
                        setHasFlash(true);
                    }
                }
                setHasCameraPermission(true);
            } catch (err) {
                console.error("Error accessing camera:", err);
                setHasCameraPermission(false);
            }
        };

        const tick = () => {
            if (!cameraEnabled) return;

            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current;
                const canvas = canvasRef.current;

                if (canvas) {
                    // Only update canvas dimensions if they changed to save performance
                    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                    }

                    const ctx = canvas.getContext("2d", { willReadFrequently: true });
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        if (code && code.data) {
                            // Only scan if modal is closed and not pending new request
                            if (code.data !== lastScannedRef.current && !showSuccessModalRef.current && !isPendingRef.current) {
                                handleScan(code.data, 'camera');
                            }
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [cameraEnabled]); // Camera restarts when enabled/disabled

    const toggleFlash = async () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];

            try {
                await track.applyConstraints({
                    advanced: [{ torch: !isFlashOn } as any]
                });
                setIsFlashOn(!isFlashOn);
            } catch (err) {
                toast.error("Could not toggle flashlight");
            }
        }
    };

    const handleScan = (data: string, source: 'camera' | 'manual' = 'manual') => {
        const event = sessionEvent || sessionEventRef.current;
        if (lastScannedRef.current === data || !event) return;

        // Validation block REMOVED

        lastScannedRef.current = data;

        // Extract code: "https://example.com/ticket/CODE" -> "CODE"
        // Also handle raw codes just in case
        const accessCode = data.includes('/') ? data.split('/').pop() || "" : data;

        toast.info("Validating ticket...");

        validate({
            event_id: event.id,
            scanner_key: event.scanner_key,
            access_code: accessCode,
        });
    };

    const submitManualCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;

        handleScan(manualCode, 'manual');
        setManualCode("");
        setShowManualEntry(false);
    };

    const handleContinue = () => {
        setShowSuccessModal(false);
        setScannedTicket(null);
        lastScannedRef.current = ""; // Reset ref to allow scanning same code again if needed (or keep to prevent double scan)
        // Usually better to clear ref so they can scan next person
    };

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent">
                <button
                    onClick={() => router.back()}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                >
                    ← Exit
                </button>

                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-full">
                    <span className={`text-[10px] uppercase tracking-widest font-bold ml-2 ${cameraEnabled ? 'text-green-400' : 'text-white/40'}`}>
                        {cameraEnabled ? 'Auto-Scan' : 'Manual'}
                    </span>
                    <button
                        onClick={() => setCameraEnabled(!cameraEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${cameraEnabled ? 'bg-green-500/30' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${cameraEnabled ? 'right-1 bg-green-500' : 'left-1 bg-white/40'}`}></div>
                    </button>
                </div>

                <div className="hidden sm:block text-right">
                    <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider">Event ID: {sessionEvent?.id}</p>
                </div>
            </div>

            {/* Viewfinder Area */}
            <div className="flex-1 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gray-950">
                    {!cameraEnabled ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10">
                                <span className="text-4xl">⌨️</span>
                            </div>
                            <h3 className="text-white font-bold text-xl mb-2">Manual Verification</h3>
                            <p className="text-white/50 text-sm max-w-[240px] text-center">Camera is disabled. Please use manual entry for verification.</p>
                            <button
                                onClick={() => setShowManualEntry(true)}
                                className="mt-8 bg-primary text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20"
                            >
                                Open Manual Entry
                            </button>
                        </div>
                    ) : hasCameraPermission === false ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-black">
                            <p className="text-center px-4">Camera access denied.<br />Please enable permissions.</p>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className="w-full h-full object-cover opacity-60"
                        />
                    )}
                </div>

                {cameraEnabled && (
                    <>
                        <div className="relative z-10 w-72 h-72 border-2 border-primary/30 rounded-[40px] flex flex-col items-center justify-between p-4 shadow-[0_0_0_1000px_rgba(0,0,0,0.7)] group">
                            <div className="absolute inset-0 bg-primary/5 rounded-[40px] animate-pulse"></div>
                            <div className="w-full flex justify-between relative z-10">
                                <div className="w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                                <div className="w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                            </div>

                            <div className="flex flex-col items-center gap-2 relative z-10">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
                                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Searching</span>
                            </div>

                            {isScanning && !showSuccessModal && (
                                <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                            )}

                            <div className="w-full flex justify-between relative z-10">
                                <div className="w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                                <div className="w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                            </div>
                        </div>

                        <p className="absolute bottom-32 z-20 text-white/90 text-xs font-bold bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-xl tracking-wide uppercase">
                            Align QR code within frame
                        </p>
                    </>
                )}
            </div>

            {/* Footer Actions */}
            {!showSuccessModal && (
                <div className="bg-white rounded-t-3xl p-6 absolute bottom-0 left-0 right-0 z-20 pb-10">
                    <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
                    <div className={`grid gap-4 ${hasFlash ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button
                            onClick={() => setShowManualEntry(true)}
                            className="bg-primary/10 text-primary font-bold py-4 rounded-xl hover:bg-primary/20 transition-colors flex flex-col items-center gap-2"
                        >
                            <span className="text-2xl">+</span>
                            Manual Entry
                        </button>
                        {hasFlash && (
                            <button
                                onClick={toggleFlash}
                                className={`font-bold py-4 rounded-xl transition-colors flex flex-col items-center gap-2 ${isFlashOn ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-900 hover:bg-gray-200 "}`}
                            >
                                <span className="text-2xl">{isFlashOn ? "🔦" : "⚡"}</span>
                                {isFlashOn ? "Flash On" : "Flashlight"}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Enter Code Manually</h3>
                            <button
                                onClick={() => setShowManualEntry(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submitManualCode} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Enter ticket code..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-lg text-black"
                                    autoFocus
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                {isPending ? "Validating..." : "Submit Code"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 perspective-1000">
                    <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Ticket Valid!</h2>
                            <p className="text-gray-500 mb-8 font-medium">Entry Authorized</p>

                            <div className="w-full bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Ticket Type</p>
                                        <p className="text-lg font-bold text-gray-900">{scannedTicket?.ticket_name}</p>
                                    </div>
                                    <div className="w-full h-px bg-gray-200"></div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guest Name</p>
                                        <p className="text-lg font-bold text-gray-900">{scannedTicket?.name}</p>
                                    </div>
                                    <div>
                                        {/* Check if email exists before rendering if optional, but interface says string */}
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                                        <p className="text-sm font-medium text-gray-600 truncate">{scannedTicket?.email}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleContinue}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
                            >
                                Continue Scanning
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
            @keyframes scan {
                0%, 100% { transform: translateY(-120px); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                50% { transform: translateY(120px); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
             @keyframes slideUp {
                from { opacity: 0; transform: translateY(100%); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
        </div>
    );
}
