"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
  voteCount: number;
  petName?: string;
  petId: string;
  isAuthenticated: boolean;
  mealRate: number;
  animalType: string;
};

const SHELTER_FACTS = [
  "6.3 million animals enter U.S. shelters every year",
  "About 920,000 shelter animals are euthanized each year",
  "1 in 5 shelter pets go hungry on any given day",
  "A single meal can keep a shelter pet healthy for a day",
  "Your votes directly fund meals for shelter pets in need",
  "Every 11 seconds, a shelter animal is euthanized in the US",
  "Shelter pets with proper nutrition are 3x more likely to be adopted",
];

export function ImpactModal({
  open,
  onClose,
  voteCount,
  petName,
  petId,
  isAuthenticated,
  mealRate,
  animalType,
}: Props) {
  const factRef = useRef(Math.floor(Math.random() * SHELTER_FACTS.length));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      factRef.current = Math.floor(Math.random() * SHELTER_FACTS.length);
      setClosing(false);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop - click to close */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-[360px] w-full overflow-hidden transition-all duration-200 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Green top banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 text-center text-white">
          <div className="text-3xl mb-1">🐾</div>
          <h3 className="text-lg font-black">You Just Helped!</h3>
          <p className="text-sm mt-1 text-white/90">
            Your vote for {petName || "this pet"} helps feed shelter {animalType}
          </p>
        </div>

        {/* Impact stats */}
        <div className="px-5 py-4 space-y-3">
          {/* Votes so far */}
          <div className="text-center">
            <p className="text-3xl font-black text-surface-900">{voteCount}</p>
            <p className="text-xs text-surface-500 font-medium">total votes = ~{voteCount} meals provided</p>
          </div>

          {/* Shelter fact */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              💡 <span className="font-semibold">Did you know?</span> {SHELTER_FACTS[factRef.current]}
            </p>
          </div>

          {/* CTA - Upsell packages */}
          <div className="space-y-2">
            <p className="text-center text-[10px] font-bold text-surface-500 uppercase tracking-wide">
              Feed even more shelter pets
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={isAuthenticated ? `/dashboard?buy=FRIEND&pet=${petId}` : `/auth/signin?callbackUrl=/dashboard?buy=FRIEND&pet=${petId}`}
                className="rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white p-3 text-center hover:shadow-lg transition-all active:scale-95"
              >
                <p className="text-lg font-black">30</p>
                <p className="text-[10px] opacity-80">votes</p>
                <p className="text-sm font-bold mt-1">$4.99</p>
                <p className="text-[10px] mt-0.5 text-emerald-200">~{Math.round(4.99 * mealRate)} meals 🐾</p>
              </Link>
              <Link
                href={isAuthenticated ? `/dashboard?buy=SUPPORTER&pet=${petId}` : `/auth/signin?callbackUrl=/dashboard?buy=SUPPORTER&pet=${petId}`}
                className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white p-3 text-center hover:shadow-lg transition-all active:scale-95 relative"
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-500 text-[8px] font-bold uppercase text-white whitespace-nowrap">
                  Most Popular
                </span>
                <p className="text-lg font-black">60</p>
                <p className="text-[10px] opacity-80">votes</p>
                <p className="text-sm font-bold mt-1">$9.99</p>
                <p className="text-[10px] mt-0.5 text-emerald-100">~{Math.round(9.99 * mealRate)} meals 🐾</p>
              </Link>
            </div>
          </div>

          {/* Close / keep voting */}
          <button
            onClick={handleClose}
            className="w-full py-2 text-sm font-semibold text-surface-400 hover:text-surface-600 transition-colors"
          >
            Keep voting for free →
          </button>
        </div>
      </div>
    </div>
  );
}
