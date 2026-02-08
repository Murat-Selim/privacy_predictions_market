"use client";

interface AssetSelectorProps {
    selected: string;
    onSelect: (asset: string) => void;
}

const assets = [
    { symbol: "BTC", name: "Bitcoin", icon: "₿" },
    { symbol: "SOL", name: "Solana", icon: "◎" },
];

export function AssetSelector({ selected, onSelect }: AssetSelectorProps) {
    return (
        <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-full w-fit">
            {assets.map((asset) => {
                const isSelected = selected === asset.symbol;
                return (
                    <button
                        key={asset.symbol}
                        onClick={() => onSelect(asset.symbol)}
                        className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isSelected
                                ? "bg-[#2dd4bf] text-[#051414] shadow-[0_0_20px_rgba(45,212,191,0.4)]"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                            }`}
                        aria-pressed={isSelected}
                        aria-label={`Select ${asset.name}`}
                    >
                        <span className={`text-lg transition-transform ${isSelected ? "scale-110" : "group-hover:scale-105"}`}>
                            {asset.icon}
                        </span>
                        <span>{asset.symbol}</span>
                    </button>
                );
            })}
        </div>
    );
}
