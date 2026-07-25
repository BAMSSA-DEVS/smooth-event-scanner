"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authenticateScanner, AuthPayload } from "@/lib/api/auth";
import { toast } from "sonner";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [scannerKey, setScannerKey] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: AuthPayload) => authenticateScanner(payload),
    onSuccess: (data) => {
      if (data.status) {
        sessionStorage.setItem("event_data", JSON.stringify(data.data.event));
        toast.success("Authentication successful");
        router.push("/dashboard");
      } else {
        toast.error("Authentication failed");
      }
    },
    onError: (error) => {
      console.error(error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An error occurred during authentication");
      }
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventId && scannerKey) {
      mutate({ event_id: Number(eventId), scanner_key: scannerKey });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Scanner Login</h1>
          <p className="text-gray-500 mt-2">Enter Event ID and Scanner Key</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="eventId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event ID
            </label>
            <input
              id="eventId"
              type="number"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="e.g. 2"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="scannerKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Scanner Key
            </label>
            <input
              id="scannerKey"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="e.g. UIYXTN"
              value={scannerKey}
              onChange={(e) => setScannerKey(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-primary shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-2">Where to find your Event ID &amp; Scanner Key</p>
              <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Log in to your <span className="font-medium text-gray-900">Smooth Tickets dashboard</span> and open the event you want to scan for.
                </li>
                <li>
                  On the <span className="font-medium text-gray-900">Event Info</span> tab, copy the <span className="font-medium text-gray-900">Event ID</span> and <span className="font-medium text-gray-900">Scanner Key</span> shown there.
                </li>
                <li>
                  If no Scanner Key is displayed, tap <span className="font-medium text-gray-900">Generate Scanner Key</span> to create one, then copy it.
                </li>
                <li>
                  Paste both values into the fields above and sign in.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
