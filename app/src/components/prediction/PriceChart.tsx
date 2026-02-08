"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CandlestickData, CandlestickSeries } from "lightweight-charts";

interface PriceChartProps {
    assetSymbol: string;
    onRangeSelect: (min: number, max: number) => void;
}

export function PriceChart({ assetSymbol, onRangeSelect }: PriceChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [range, setRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "rgba(255, 255, 255, 0.5)",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.03)" },
                horzLines: { color: "rgba(255, 255, 255, 0.03)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 320,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                vertLine: {
                    color: "rgba(45, 212, 191, 0.3)",
                    labelBackgroundColor: "#2dd4bf",
                },
                horzLine: {
                    color: "rgba(45, 212, 191, 0.3)",
                    labelBackgroundColor: "#2dd4bf",
                },
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#2dd4bf",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#2dd4bf",
            wickDownColor: "#ef4444",
        });

        // Mock data generation
        const generateData = () => {
            const data: CandlestickData[] = [];
            let lastPrice = assetSymbol === "BTC" ? 65000 : 150;
            const startPrice = lastPrice;
            let time = Math.floor(Date.now() / 1000) - 3600 * 24;

            for (let i = 0; i < 200; i++) {
                const open = lastPrice;
                const close = open + (Math.random() - 0.5) * (open * 0.01);
                const high = Math.max(open, close) + Math.random() * (open * 0.005);
                const low = Math.min(open, close) - Math.random() * (open * 0.005);

                data.push({
                    time: time as any,
                    open,
                    high,
                    low,
                    close,
                });

                lastPrice = close;
                time += 600; // 10 min steps
            }

            const endPrice = data[data.length - 1].close;
            const change = ((endPrice - startPrice) / startPrice) * 100;
            setPriceChange(change);

            return data;
        };

        const initialData = generateData();
        series.setData(initialData);
        setCurrentPrice(initialData[initialData.length - 1].close);

        // Initial range
        const lastClose = initialData[initialData.length - 1].close;
        setRange({ min: lastClose * 0.95, max: lastClose * 1.05 });

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [assetSymbol]);

    useEffect(() => {
        if (range.min && range.max) {
            onRangeSelect(Math.floor(range.min), Math.floor(range.max));
        }
    }, [range, onRangeSelect]);

    const handleMinChange = useCallback((value: number) => {
        setRange(prev => ({
            ...prev,
            min: Math.min(value, prev.max - 1)
        }));
    }, []);

    const handleMaxChange = useCallback((value: number) => {
        setRange(prev => ({
            ...prev,
            max: Math.max(value, prev.min + 1)
        }));
    }, []);

    const rangeWidth = currentPrice ? ((range.max - range.min) / currentPrice) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header with price info */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">
                        Live {assetSymbol} Price
                    </p>
                    <div className="flex items-baseline gap-3">
                        <p className="text-3xl md:text-4xl font-light tabular-nums">
                            ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${priceChange >= 0
                                ? "text-[#2dd4bf] bg-[#2dd4bf]/10"
                                : "text-[#ef4444] bg-[#ef4444]/10"
                            }`}>
                            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf] mb-1 font-semibold">
                        Your Prediction Range
                    </p>
                    <p className="text-lg font-medium text-white/80 tabular-nums">
                        ${Math.floor(range.min).toLocaleString()} — ${Math.floor(range.max).toLocaleString()}
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                        {rangeWidth.toFixed(1)}% range width
                    </p>
                </div>
            </div>

            {/* Chart container */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                <div ref={chartContainerRef} className="w-full h-[320px]" />
            </div>

            {/* Range sliders */}
            <div className="space-y-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
                        Adjust Range
                    </span>
                    <button
                        onClick={() => {
                            if (currentPrice) {
                                setRange({ min: currentPrice * 0.95, max: currentPrice * 1.05 });
                            }
                        }}
                        className="text-[10px] uppercase tracking-[0.15em] text-[#2dd4bf] hover:text-[#2dd4bf]/80 transition-colors font-medium"
                    >
                        Reset to ±5%
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-white/40">Lower Bound</label>
                            <span className="text-xs text-white/60 font-mono">${Math.floor(range.min).toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            className="w-full"
                            min={currentPrice ? currentPrice * 0.5 : 0}
                            max={currentPrice ? currentPrice * 1.5 : 200000}
                            step={currentPrice ? currentPrice * 0.001 : 1}
                            value={range.min}
                            onChange={(e) => handleMinChange(Number(e.target.value))}
                            aria-label="Lower bound slider"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-white/40">Upper Bound</label>
                            <span className="text-xs text-white/60 font-mono">${Math.floor(range.max).toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            className="w-full"
                            min={currentPrice ? currentPrice * 0.5 : 0}
                            max={currentPrice ? currentPrice * 1.5 : 200000}
                            step={currentPrice ? currentPrice * 0.001 : 1}
                            value={range.max}
                            onChange={(e) => handleMaxChange(Number(e.target.value))}
                            aria-label="Upper bound slider"
                        />
                    </div>
                </div>
            </div>

            {/* Manual input fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="group p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-colors focus-within:border-[#2dd4bf]/30">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 block mb-2 font-medium">
                        Lower Bound ($)
                    </label>
                    <input
                        type="number"
                        value={Math.floor(range.min)}
                        onChange={(e) => handleMinChange(Number(e.target.value))}
                        className="bg-transparent text-xl font-light w-full outline-none text-white/90 placeholder:text-white/20"
                        placeholder="0"
                        min={0}
                        aria-label="Lower bound input"
                    />
                </div>
                <div className="group p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-colors focus-within:border-[#2dd4bf]/30">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/30 block mb-2 font-medium">
                        Upper Bound ($)
                    </label>
                    <input
                        type="number"
                        value={Math.floor(range.max)}
                        onChange={(e) => handleMaxChange(Number(e.target.value))}
                        className="bg-transparent text-xl font-light w-full outline-none text-white/90 placeholder:text-white/20"
                        placeholder="0"
                        min={0}
                        aria-label="Upper bound input"
                    />
                </div>
            </div>
        </div>
    );
}
