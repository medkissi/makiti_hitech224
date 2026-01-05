import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconClassName?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon, iconClassName, trend, className }: StatCardProps) {
  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-display">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", iconClassName || "bg-primary/10 text-primary")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
