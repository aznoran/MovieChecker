"use client";

import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Loader2} from "lucide-react";
import {RegisterForm} from "./_components/register-form";

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </CardContent>
                </Card>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
