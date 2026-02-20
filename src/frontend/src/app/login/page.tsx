"use client";

import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Loader2} from "lucide-react";
import {LoginForm} from "./_components/login-form";

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </CardContent>
                </Card>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
