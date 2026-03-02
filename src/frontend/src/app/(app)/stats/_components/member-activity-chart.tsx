"use client";

import {Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer} from "recharts";

const BAR_COLORS = [
    "hsl(217, 91%, 60%)",
    "hsl(142, 71%, 45%)",
    "hsl(48, 96%, 53%)",
    "hsl(270, 70%, 60%)",
    "hsl(350, 70%, 55%)",
    "hsl(190, 80%, 50%)",
];

interface MemberActivityChartProps {
    data: { name: string; count: number }[];
}

export function MemberActivityChart({data}: MemberActivityChartProps) {
    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{left: 0, right: 20, top: 5, bottom: 5}}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/30"/>
                    <XAxis type="number" hide/>
                    <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        width={100}
                        className="text-xs"
                    />
                    <Tooltip
                        content={({active, payload}) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0];
                            return (
                                <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-xl">
                                    <span className="font-medium">{item.payload?.name}</span>
                                    <div className="text-muted-foreground mt-0.5">{String(item.value)}</div>
                                </div>
                            );
                        }}
                        cursor={{fill: "hsl(var(--muted))", opacity: 0.3}}
                    />
                    <Bar
                        dataKey="count"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={36}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]}/>
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
