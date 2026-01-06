import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Taille } from "@/lib/constants";

interface StockIndicatorProps {
  totalStock: number;
  threshold?: number;
  showText?: boolean;
  size?: "sm" | "md";
}

export function StockIndicator({ 
  totalStock, 
  threshold = 5, 
  showText = false,
  size = "md"
}: StockIndicatorProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  
  if (totalStock === 0) {
    return (
      <div className={cn("flex items-center gap-1", "text-destructive")}>
        <XCircle className={iconSize} />
        {showText && <span className="text-xs font-medium">Épuisé</span>}
      </div>
    );
  }
  
  if (totalStock <= threshold) {
    return (
      <div className={cn("flex items-center gap-1", "text-warning")}>
        <AlertTriangle className={iconSize} />
        {showText && <span className="text-xs font-medium">Stock faible ({totalStock})</span>}
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-1", "text-success")}>
      <CheckCircle className={iconSize} />
      {showText && <span className="text-xs font-medium">En stock ({totalStock})</span>}
    </div>
  );
}

export function getStockStatus(totalStock: number, threshold = 5): "out" | "low" | "ok" {
  if (totalStock === 0) return "out";
  if (totalStock <= threshold) return "low";
  return "ok";
}

// Stock badge for individual sizes with color coding
interface SizeStockBadgeProps {
  taille: Taille;
  quantite: number;
  threshold?: number;
  onClick?: () => void;
  disabled?: boolean;
}

export function SizeStockBadge({ 
  taille, 
  quantite, 
  threshold = 5,
  onClick,
  disabled = false
}: SizeStockBadgeProps) {
  const status = getStockStatus(quantite, threshold);
  
  const colorClasses = {
    out: "text-destructive border-destructive/30 bg-destructive/5",
    low: "text-warning border-warning/30 bg-warning/5",
    ok: "text-success border-success/30 bg-success/5",
  };

  const hoverClasses = {
    out: "",
    low: "hover:bg-warning/10 hover:border-warning/50",
    ok: "hover:bg-success/10 hover:border-success/50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || quantite === 0}
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs font-medium transition-colors",
        colorClasses[status],
        !disabled && quantite > 0 && hoverClasses[status],
        (disabled || quantite === 0) && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="font-semibold">{taille}</span>
      <span className="text-[10px] opacity-80">:{quantite}</span>
    </button>
  );
}

// Component to display all sizes with their stock
interface SizeStockBadgesProps {
  stock: { taille: Taille; quantite_actuelle: number }[];
  threshold?: number;
  onSizeClick?: (taille: Taille) => void;
  showOutOfStock?: boolean;
}

export function SizeStockBadges({ 
  stock, 
  threshold = 5,
  onSizeClick,
  showOutOfStock = false
}: SizeStockBadgesProps) {
  const filteredStock = showOutOfStock 
    ? stock 
    : stock.filter(s => s.quantite_actuelle > 0);

  if (filteredStock.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">Rupture de stock</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {filteredStock.map((s) => (
        <SizeStockBadge
          key={s.taille}
          taille={s.taille}
          quantite={s.quantite_actuelle}
          threshold={threshold}
          onClick={onSizeClick ? () => onSizeClick(s.taille) : undefined}
        />
      ))}
    </div>
  );
}
