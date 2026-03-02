"use client";

import {Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer} from "recharts";

interface ActivityTimelineChartProps {
    data: { date: string; count: number }[];
}

export function ActivityTimelineChart({data}: ActivityTimelineChartProps) {
    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{left: 0, right: 20, top: 5, bottom: 5}}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30"/>
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                        tickFormatter={(v) => {
                            const d = new Date(v);
                            return `${d.getDate()}.${d.getMonth() + 1}`;
                        }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        className="text-xs"
                        allowDecimals={false}
                    />
                    <Tooltip
                        content={({active, payload, label}) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-xl">
                                    <span className="font-medium">{label}</span>
                                    <div className="text-muted-foreground mt-0.5">{String(payload[0].value)}</div>
                                </div>
                            );
                        }}
                        cursor={{stroke: "hsl(var(--muted-foreground))", strokeWidth: 1}}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={2}
                        fill="url(#colorCount)"
                        animationBegin={0}
                        animationDuration={800}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
