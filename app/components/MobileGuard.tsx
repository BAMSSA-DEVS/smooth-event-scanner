"use client";

import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";

export default function MobileGuard({ children }: { children: React.ReactNode }) {
    // Optional: Add a mounted check to avoid hydration mismatch if we were rendering different content,
    // but with CSS hidden classes it handles it gracefully usually. 
    // However, for a cleaner "not supported" screen, we want to render the guard ONLY on desktop.

    return (
        <>
            <Toaster position="top-center" richColors />
            {/* Mobile Content: Visible only on small screens (md:hidden blocks it on medium+) */}
            <div className="md:hidden min-h-screen w-full">
                {children}
            </div>

            {/* Desktop Disclaimer: Hidden on small screens, visible on md+ */}
            <div className="hidden md:flex min-h-screen w-full bg-gray-50 flex-col items-center justify-center p-8 text-center">
                <div className="max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                    <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                            <path d="M12 18h.01" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Mobile Device Required</h1>
                    <p className="text-gray-500 mb-8">
                        The SmoothScanner app is designed explicitly for mobile scanning workflows.
                        Please access this URL on your phone to continue.
                    </p>

                    <div className="text-sm text-gray-400 border-t pt-6 border-gray-100">
                        open <strong>smoothscanner.app</strong> on your mobile browser
                    </div>
                </div>
            </div>
        </>
    );
}
