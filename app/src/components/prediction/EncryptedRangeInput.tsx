"use client";

import { useCallback } from "react";
import { PriceChart } from "./PriceChart";

interface EncryptedRangeInputProps {
    assetSymbol: string;
    onRangeChange: (min: number, max: number) => void;
}

export function EncryptedRangeInput({ assetSymbol, onRangeChange }: EncryptedRangeInputProps) {
    const handleRangeSelect = useCallback((min: number, max: number) => {
        onRangeChange(min, max);
    }, [onRangeChange]);

    return (
        <div className="space-y-8">
            <PriceChart
                assetSymbol={assetSymbol}
                onRangeSelect={handleRangeSelect}
            />

            {/* Privacy Shield Info */}
            <div className="p-5 bg-gradient-to-br from-[#2dd4bf]/5 to-transparent border border-[#2dd4bf]/10 rounded-2xl">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-[#2dd4bf]">FHE Privacy Shield</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[10px] uppercase tracking-[0.1em] text-[#2dd4bf] font-medium">Active</span>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Your prediction range is encrypted locally in your browser using Fully Homomorphic Encryption. Only encrypted handles are sent on-chain, and matching runs entirely on encrypted values.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
