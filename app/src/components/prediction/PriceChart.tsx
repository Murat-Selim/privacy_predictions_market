"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts";

interface PriceChartProps {
    assetSymbol: string;
    onRangeSelect: (min: number, max: number) => void;
}

export function PriceChart({ assetSymbol, onRangeSelect }: PriceChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [range, setRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "rgba(255, 255, 255, 0.5)",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#3673F5",
            downColor: "#ff4949",
            borderVisible: false,
            wickUpColor: "#3673F5",
            wickDownColor: "#ff4949",
        });

        // Mock data generation
        const generateData = () => {
            const data: CandlestickData[] = [];
            let lastPrice = assetSymbol === "BTC" ? 65000 : 150;
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/30">Live {assetSymbol} Price</p>
                    <p className="text-3xl font-light tabular-nums">
                        ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-[#3673F5] mb-1 font-semibold">Your Prediction Range</p>
                    <p className="text-sm font-medium text-white/70 tabular-nums">
                        ${Math.floor(range.min).toLocaleString()} — ${Math.floor(range.max).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                <div ref={chartContainerRef} className="w-full h-[300px]" />

                {/* Overlay for range selection sliders (conceptual) */}
                <div className="absolute inset-x-0 bottom-4 px-8 space-y-4 pointer-events-none">
                    <input
                        type="range"
                        className="w-full pointer-events-auto accent-[#3673F5]"
                        min={currentPrice ? currentPrice * 0.5 : 0}
                        max={currentPrice ? currentPrice * 1.5 : 200000}
                        value={range.min}
                        onChange={(e) => setRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    />
                    <input
                        type="range"
                        className="w-full pointer-events-auto accent-[#3673F5]"
                        min={currentPrice ? currentPrice * 0.5 : 0}
                        max={currentPrice ? currentPrice * 1.5 : 200000}
                        value={range.max}
                        onChange={(e) => setRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase text-white/20 block mb-1">Lower Bound</span>
                    <input
                        type="number"
                        value={Math.floor(range.min)}
                        onChange={(e) => setRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                        className="bg-transparent text-xl font-light w-full outline-none"
                    />
                </div>
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <span className="text-[10px] uppercase text-white/20 block mb-1">Upper Bound</span>
                    <input
                        type="number"
                        value={Math.floor(range.max)}
                        onChange={(e) => setRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                        className="bg-transparent text-xl font-light w-full outline-none"
                    />
                </div>
            </div>
        </div>
    );
}
