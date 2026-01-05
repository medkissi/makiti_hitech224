import { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, getTodayDate } from "@/lib/constants";

interface DashboardStats {
  ventesAujourdhui: number;
  nombreVentes: number;
  produitsEnStock: number;
  stockBas: number;
}

export default function Dashboard() {
  const { profile, userRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    ventesAujourdhui: 0,
    nombreVentes: 0,
    produitsEnStock: 0,
    stockBas: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = getTodayDate();

      // Get today's sales
      const { data: salesData } = await supabase
        .from("sales")
        .select("montant_total")
        .gte("date_vente", `${today}T00:00:00`)
        .lte("date_vente", `${today}T23:59:59`);

      // Get products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("actif", true);

      // Get low stock count
      const { data: stockData } = await supabase
        .from("stock")
        .select("*")
        .lt("quantite_actuelle", 5);

      // Get recent sales
      const { data: recentSalesData } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            quantite,
            prix_total,
            products (nom, code_modele)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      const totalVentes = salesData?.reduce((sum, sale) => sum + (sale.montant_total || 0), 0) || 0;

      setStats({
        ventesAujourdhui: totalVentes,
        nombreVentes: salesData?.length || 0,
        produitsEnStock: productsCount || 0,
        stockBas: stockData?.length || 0,
      });

      setRecentSales(recentSalesData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <AppLayout>
      <PageHeader
        title={`${greeting()}, ${profile?.nom_complet?.split(" ")[0] || "Utilisateur"} !`}
        description={`${formatDate(new Date())} - ${userRole === "proprietaire" ? "Propriétaire" : "Employé"}`}
        actions={
          <Link to="/plan-travail">
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Calendar className="h-4 w-4" />
              Plan du jour
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Ventes aujourd'hui"
          value={formatCurrency(stats.ventesAujourdhui)}
          icon={<TrendingUp className="h-6 w-6" />}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Nombre de ventes"
          value={stats.nombreVentes}
          icon={<ShoppingCart className="h-6 w-6" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Produits en stock"
          value={stats.produitsEnStock}
          icon={<Package className="h-6 w-6" />}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <StatCard
          title="Stock bas"
          value={stats.stockBas}
          icon={<AlertTriangle className="h-6 w-6" />}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          className={stats.stockBas > 0 ? "border-warning" : ""}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/ventes">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <ShoppingCart className="h-6 w-6" />
                <span>Nouvelle vente</span>
              </Button>
            </Link>
            <Link to="/plan-travail">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span>Plan de travail</span>
              </Button>
            </Link>
            <Link to="/produits">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Package className="h-6 w-6" />
                <span>Gérer produits</span>
              </Button>
            </Link>
            <Link to="/rapports">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>Voir rapports</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Ventes récentes</CardTitle>
            <Link to="/ventes">
              <Button variant="ghost" size="sm" className="gap-1">
                Voir tout <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucune vente récente
              </p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {sale.sale_items?.[0]?.products?.nom || "Vente"}
                        {sale.sale_items?.length > 1 && ` +${sale.sale_items.length - 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {formatCurrency(sale.montant_total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
