"use client";

import {Cell, Pie, PieChart, Tooltip, ResponsiveContainer} from "recharts";

interface StatusPieChartProps {
    data: { name: string; value: number; color: string }[];
    total: number;
}

export function StatusPieChart({data, total}: StatusPieChartProps) {
    return (
        <div className="relative w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color}/>
                        ))}
                    </Pie>
                    <Tooltip
                        content={({active, payload}) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0];
                            const pct = total > 0 ? Math.round((Number(item.value) / total) * 100) : 0;
                            return (
                                <div
                                    className="rounded-lg border bg-background px-3 py-2 text-sm shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{backgroundColor: item.payload?.color}}
                                        />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                        {String(item.value)} ({pct}%)
                                    </div>
                                </div>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold">{total}</span>
                <span className="text-xs text-muted-foreground">total</span>
            </div>
        </div>
    );
}
