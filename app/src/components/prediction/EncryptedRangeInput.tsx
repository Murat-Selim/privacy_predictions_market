"use client";

import { useState, useCallback } from "react";
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

            <div className="p-6 bg-[#3673F5]/5 border border-[#3673F5]/10 rounded-2xl">
                <div className="flex items-center gap-3 text-[#3673F5] mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm font-medium">FHE Privacy Shield</span>
                </div>
                <p className="text-white/40 text-xs leading-relaxed">
                    Your prediction range is encrypted locally using the Inco SDK. Only the encrypted handles are sent on-chain. The matching logic happens entirely within FHE.
                </p>
            </div>
        </div>
    );
}
