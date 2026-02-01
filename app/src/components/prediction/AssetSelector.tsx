"use client";

import { useState } from "react";

interface AssetSelectorProps {
    selected: string;
    onSelect: (asset: string) => void;
}

export function AssetSelector({ selected, onSelect }: AssetSelectorProps) {
    const assets = ["BTC", "SOL"];

    return (
        <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl w-fit">
            {assets.map((asset) => (
                <button
                    key={asset}
                    onClick={() => onSelect(asset)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${selected === asset
                            ? "bg-[#3673F5] text-white shadow-[0_0_15px_rgba(54,115,245,0.4)]"
                            : "text-white/40 hover:text-white/70"
                        }`}
                >
                    {asset}
                </button>
            ))}
        </div>
    );
}
