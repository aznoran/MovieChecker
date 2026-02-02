"use client";

import {useRouter} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
    Clapperboard,
    Users,
    Star,
    TrendingUp,
    BarChart3,
    Image as ImageIcon,
    Zap,
    Heart,
    DollarSign,
    ArrowRight,
    Film,
    Languages,
} from "lucide-react";
import {ThemeToggle} from "@/components/theme-toggle";
import type {Locale} from "@/lib/i18n";

export default function LandingPage() {
    const {locale, setLocale, t} = useLocale();
    const {isAuthenticated} = useAuth();
    const router = useRouter();

    if (isAuthenticated) {
        router.push("/");
        return null;
    }

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const features = [
        {
            icon: Clapperboard,
            title: t("landingFeature1Title"),
            description: t("landingFeature1Desc"),
        },
        {
            icon: Users,
            title: t("landingFeature2Title"),
            description: t("landingFeature2Desc"),
        },
        {
            icon: Star,
            title: t("landingFeature3Title"),
            description: t("landingFeature3Desc"),
        },
        {
            icon: TrendingUp,
            title: t("landingFeature4Title"),
            description: t("landingFeature4Desc"),
        },
        {
            icon: BarChart3,
            title: t("landingFeature5Title"),
            description: t("landingFeature5Desc"),
        },
        {
            icon: ImageIcon,
            title: t("landingFeature6Title"),
            description: t("landingFeature6Desc"),
        },
    ];

    const whyChoose = [
        {
            icon: Zap,
            title: t("landingWhy1Title"),
            description: t("landingWhy1Desc"),
        },
        {
            icon: Heart,
            title: t("landingWhy2Title"),
            description: t("landingWhy2Desc"),
        },
        {
            icon: DollarSign,
            title: t("landingWhy3Title"),
            description: t("landingWhy3Desc"),
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Film className="h-6 w-6"/>
                        <span className="font-bold text-xl">{t("appName")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle/>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleLocale}
                            className="gap-1.5 text-muted-foreground"
                        >
                            <Languages className="h-4 w-4"/>
                            {locale.toUpperCase()}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push("/login")}
                        >
                            {t("landingSignIn")}
                        </Button>
                        <Button onClick={() => router.push("/login?register=true")}>
                            {t("landingGetStarted")}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 text-center">
                <div className="max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <Clapperboard className="h-16 w-16 text-primary"/>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        {t("landingHeroTitle")}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8">
                        {t("landingHeroSubtitle")}
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Button
                            size="lg"
                            onClick={() => router.push("/login?register=true")}
                            className="gap-2"
                        >
                            {t("landingGetStarted")}
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => router.push("/login")}
                        >
                            {t("landingSignIn")}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4 py-20 bg-muted/50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                        {t("landingFeaturesTitle")}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={index}>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="mb-4 p-3 bg-primary/10 rounded-full">
                                                <Icon className="h-6 w-6 text-primary"/>
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Why Choose Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                        {t("landingWhyTitle")}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {whyChoose.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <div key={index} className="text-center">
                                    <div className="flex justify-center mb-4">
                                        <div className="p-4 bg-primary/10 rounded-full">
                                            <Icon className="h-8 w-8 text-primary"/>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-20 bg-muted/50">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {t("landingCtaTitle")}
                    </h2>
                    <p className="text-xl text-muted-foreground mb-8">
                        {t("landingCtaSubtitle")}
                    </p>
                    <Button
                        size="lg"
                        onClick={() => router.push("/login?register=true")}
                        className="gap-2"
                    >
                        {t("landingCtaButton")}
                        <ArrowRight className="h-4 w-4"/>
                    </Button>
                </div>
            </section>
        </div>
    );
}
