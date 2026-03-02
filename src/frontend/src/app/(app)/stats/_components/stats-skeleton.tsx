import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

export function StatsPageSkeleton() {
    return (
        <div className="space-y-4">
            {/* Top stat cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from({length: 4}).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between mb-3">
                                <Skeleton className="h-4 w-20"/>
                                <Skeleton className="h-5 w-5 rounded-full"/>
                            </div>
                            <Skeleton className="h-8 w-16 mb-2"/>
                            <Skeleton className="h-2 w-full rounded-full"/>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Middle row */}
            <div className="grid gap-3 lg:grid-cols-5">
                {/* Donut chart */}
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-40"/>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center py-6">
                            <Skeleton className="h-52 w-52 rounded-full"/>
                        </div>
                    </CardContent>
                </Card>

                {/* Rating */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-32"/>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                        <Skeleton className="h-16 w-28"/>
                        <Skeleton className="h-6 w-48"/>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom row */}
            <Card>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-36"/>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-56 w-full rounded-lg"/>
                </CardContent>
            </Card>
        </div>
    );
}
