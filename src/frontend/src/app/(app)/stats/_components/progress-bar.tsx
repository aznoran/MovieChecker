export function ProgressBar({
    value,
    max,
    color,
}: {
    value: number;
    max: number;
    color: string;
}) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{width: `${pct}%`}}
            />
        </div>
    );
}
