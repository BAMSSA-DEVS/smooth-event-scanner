"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EventData {
    id: number;
    description: string;
    name: string;
    image: {
        id: string;
        link: string;
    };
    start_date: string;
    end_date: string;
    scanner_key: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [event, setEvent] = useState<EventData | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const storedEvent = sessionStorage.getItem("event_data");
        if (storedEvent) {
            try {
                setEvent(JSON.parse(storedEvent));
            } catch (e) {
                console.error("Failed to parse event data", e);
                toast.error("Failed to load event data");
            }
        } else {
            router.push("/");
        }
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem("event_data");
        router.push("/");
    };

    if (!event) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Events</h1>
                    <p className="text-gray-500 text-sm">Select an event to start scanning</p>
                </div>
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="h-10 px-4 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                    Log Out
                </button>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`group relative bg-white rounded-2xl shadow-sm border border-gray-100 text-left transition-all overflow-hidden cursor-pointer ${isExpanded ? 'p-6 ring-2 ring-primary/10' : 'p-6 hover:shadow-md hover:border-primary/50'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {event.name}
                        </h3>
                        <div className={`text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'group-hover:text-primary'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-primary text-xs">📅</span>
                            {new Date(event.start_date).toLocaleDateString()}
                        </p>

                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
                            }`}>
                            <div className="overflow-hidden space-y-4">
                                <p className="text-sm text-gray-500 flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-primary text-xs shrink-0 mt-0.5">📍</span>
                                    {event.description}
                                </p>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/scanner/${event.id}`);
                                    }}
                                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    Start Scanning Tickets
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to log out?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
