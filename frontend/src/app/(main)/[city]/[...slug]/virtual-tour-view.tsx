"use client";

import React, { useState } from "react";
import { VirtualTourViewer } from "@/components/shared/VirtualTourViewer";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface VirtualTourViewProps {
  restaurant: any;
  city: string;
}

export default function VirtualTourView({ restaurant, city }: VirtualTourViewProps) {
  const r = restaurant;
  const router = useRouter();
  const tourData = r.virtualTour;
  const [copied, setCopied] = useState(false);

  // Fallback: if no tour data or not published, show "not available"
  if (!tourData || tourData.status !== "published" || !tourData.scenes?.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-white/30" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">Virtual Tour Not Available</h1>
        <p className="text-gray-400 mb-8 max-w-sm">This restaurant hasn&apos;t published a virtual tour yet. Check back later!</p>
        <Link 
          href={`/${city}/${r.slug}/`}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all no-underline"
        >
          ← Back to Restaurant
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${r.name} - 3D Virtual Tour`,
          text: `Check out this amazing 3D Virtual Tour of ${r.name} on Foodies Pakistan!`,
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goBack = () => {
    router.push(`/${city}/${r.slug}/`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-[120] p-3 md:p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {/* Back Button */}
          <button 
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          
          {/* Title */}
          <div className="hidden sm:flex flex-col backdrop-blur-md bg-black/40 px-4 py-1.5 rounded-2xl border border-white/10">
            <h1 className="text-white font-bold text-sm">{r.brandName || r.name}</h1>
            <p className="text-white/60 text-[10px] uppercase tracking-widest font-black">3D Virtual Tour</p>
          </div>
        </div>

        {/* Share Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors relative"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {copied && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* The Viewer Component — hideChrome since we provide our own nav */}
      <div className="flex-1 w-full h-full">
        <VirtualTourViewer 
          scenes={tourData.scenes} 
          onClose={goBack}
          hideChrome={true}
        />
      </div>

      {/* Branding Footer */}
      <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 z-[120] pointer-events-none opacity-40">
        <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-white/50 uppercase tracking-tighter">Powered by</span>
            <span className="text-xs font-black text-white/70 tracking-tighter italic">Foodies<span className="text-primary">PAKISTAN</span></span>
        </div>
      </div>
    </div>
  );
}
