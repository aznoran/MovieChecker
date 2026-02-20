import {useLocale} from "@/context/locale-context"
import {Clapperboard, BarChart3, type LucideIcon} from "lucide-react"

export type NavLink = {
    href: string
    label: string
    icon: LucideIcon
}

export function useNavLinks(): NavLink[] {
    const {t} = useLocale()

    return [
        {href: "/", label: t("navDiary"), icon: Clapperboard},
        {href: "/stats", label: t("navStats"), icon: BarChart3},
    ]
}
