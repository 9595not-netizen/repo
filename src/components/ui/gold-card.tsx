import { cn } from "@/lib/utils"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface GoldCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    glass?: boolean
}

export function GoldCard({ children, className, glass = true, ...props }: GoldCardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border-2 border-gold/70 shadow-lg transition-all duration-300 min-h-[200px] text-foreground",
                glass ? "bg-card/80 backdrop-blur-md" : "bg-card",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
