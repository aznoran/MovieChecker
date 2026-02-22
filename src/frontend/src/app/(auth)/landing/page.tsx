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
import {ThemeToggle} from "@/components/shared/theme-toggle";
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
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Film className="h-6 w-6 text-primary"/>
                        </div>
                        <span className="font-bold text-xl">{t("appName")}</span>
                    </div>
                    <div className="flex items-center gap-3">
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
                            className="hidden sm:inline-flex"
                        >
                            {t("landingSignIn")}
                        </Button>
                        <Button onClick={() => router.push("/login?register=true")} className="shadow-lg">
                            {t("landingGetStarted")}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-8 py-24 md:py-32 text-center relative">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 mb-8">
                            <div className="p-4 bg-primary/10 rounded-2xl shadow-lg">
                                <Clapperboard className="h-16 w-16 text-primary"/>
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold mb-8">
                            {t("landingHeroTitle")}
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                            {t("landingHeroSubtitle")}
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <Button
                                size="lg"
                                onClick={() => router.push("/login?register=true")}
                                className="gap-2 shadow-lg hover:shadow-xl transition-shadow text-base px-8 py-6"
                            >
                                {t("landingGetStarted")}
                                <ArrowRight className="h-5 w-5"/>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => router.push("/login")}
                                className="text-base px-8 py-6"
                            >
                                {t("landingSignIn")}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-24 md:py-32">
                <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-8 relative">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                {t("landingFeaturesTitle")}
                            </h2>
                            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <Card key={index} className="border-2 hover:border-primary/50 focus-within:border-primary/50 transition-all duration-300 hover:shadow-xl focus-within:shadow-xl group">
                                        <CardContent className="p-8">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="mb-6 p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 group-focus-within:bg-primary/20 transition-colors">
                                                    <Icon className="h-8 w-8 text-primary"/>
                                                </div>
                                                <h3 className="text-xl font-bold mb-3">
                                                    {feature.title}
                                                </h3>
                                                <p className="text-base text-muted-foreground leading-relaxed">
                                                    {feature.description}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Choose Section */}
            <section className="py-24 md:py-32 bg-background">
                <div className="container mx-auto px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                {t("landingWhyTitle")}
                            </h2>
                            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-12">
                            {whyChoose.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div key={index} className="text-center group">
                                        <div className="flex justify-center mb-6">
                                            <div className="p-5 bg-primary/10 rounded-2xl group-hover:bg-primary/20 group-focus-within:bg-primary/20 transition-all duration-300 group-hover:scale-110 group-focus-within:scale-110 shadow-lg">
                                                <Icon className="h-10 w-10 text-primary"/>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                        <p className="text-base text-muted-foreground leading-relaxed">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-24 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-8 relative">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="bg-card/50 backdrop-blur border-2 border-primary/20 rounded-3xl p-12 md:p-16 shadow-2xl">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                {t("landingCtaTitle")}
                            </h2>
                            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
                                {t("landingCtaSubtitle")}
                            </p>
                            <Button
                                size="lg"
                                onClick={() => router.push("/login?register=true")}
                                className="gap-2 shadow-xl hover:shadow-2xl transition-shadow text-base px-10 py-7"
                            >
                                {t("landingCtaButton")}
                                <ArrowRight className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
