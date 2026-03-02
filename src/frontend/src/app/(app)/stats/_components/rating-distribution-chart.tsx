"use client";

import {Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer} from "recharts";

interface RatingDistributionChartProps {
    data: { rating: string; count: number }[];
}

export function RatingDistributionChart({data}: RatingDistributionChartProps) {
    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{left: 0, right: 20, top: 5, bottom: 5}}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30"/>
                    <XAxis
                        dataKey="rating"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        className="text-xs"
                        allowDecimals={false}
                    />
                    <Tooltip
                        content={({active, payload}) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0];
                            return (
                                <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-xl">
                                    <span className="font-medium">{item.payload?.rating}</span>
                                    <div className="text-muted-foreground mt-0.5">{String(item.value)}</div>
                                </div>
                            );
                        }}
                        cursor={{fill: "hsl(var(--muted))", opacity: 0.3}}
                    />
                    <Bar
                        dataKey="count"
                        fill="hsl(48, 96%, 53%)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                        animationBegin={0}
                        animationDuration={800}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
