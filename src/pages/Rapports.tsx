import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Calendar,
  Download,
  BarChart3
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DailyStats {
  date: string;
  total: number;
  count: number;
}

interface TopProduct {
  nom: string;
  code_modele: string;
  quantite: number;
  montant: number;
}

export default function Rapports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalVentes: 0,
    nombreVentes: 0,
    moyenneVente: 0,
  });
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      // Get sales in date range
      const { data: salesData } = await supabase
        .from("sales")
        .select(`
          id, date_vente, montant_total,
          sale_items (
            quantite, prix_total,
            products (nom, code_modele)
          )
        `)
        .gte("date_vente", `${fromDate}T00:00:00`)
        .lte("date_vente", `${toDate}T23:59:59`)
        .order("date_vente", { ascending: false });

      if (salesData) {
        // Calculate totals
        const total = salesData.reduce((sum, s) => sum + (s.montant_total || 0), 0);
        const count = salesData.length;
        setTotalStats({
          totalVentes: total,
          nombreVentes: count,
          moyenneVente: count > 0 ? Math.round(total / count) : 0,
        });

        // Group by date for chart
        const byDate: Record<string, { total: number; count: number }> = {};
        salesData.forEach((sale) => {
          const date = format(new Date(sale.date_vente), "dd/MM");
          if (!byDate[date]) {
            byDate[date] = { total: 0, count: 0 };
          }
          byDate[date].total += sale.montant_total || 0;
          byDate[date].count += 1;
        });
        setDailyStats(
          Object.entries(byDate).map(([date, stats]) => ({
            date,
            total: stats.total,
            count: stats.count,
          }))
        );

        // Calculate top products
        const productStats: Record<string, TopProduct> = {};
        salesData.forEach((sale) => {
          sale.sale_items?.forEach((item: any) => {
            const key = item.products?.code_modele || "unknown";
            if (!productStats[key]) {
              productStats[key] = {
                nom: item.products?.nom || "Inconnu",
                code_modele: key,
                quantite: 0,
                montant: 0,
              };
            }
            productStats[key].quantite += item.quantite || 0;
            productStats[key].montant += item.prix_total || 0;
          });
        });
        setTopProducts(
          Object.values(productStats)
            .sort((a, b) => b.montant - a.montant)
            .slice(0, 10)
        );
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ["Code", "Produit", "Quantité vendue", "Montant total"].join(","),
      ...topProducts.map((p) =>
        [p.code_modele, p.nom, p.quantite, p.montant].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

  return (
    <AppLayout>
      <PageHeader
        title="Rapports"
        description={userRole === "proprietaire" ? "Vue complète des performances" : "Rapports de ventes"}
        actions={
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(dateRange.from, "dd MMM", { locale: fr })} -{" "}
                  {format(dateRange.to, "dd MMM", { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" className="gap-2" onClick={exportData}>
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        }
      />

      {/* Quick date filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDateRange({ from: new Date(), to: new Date() })}
        >
          Aujourd'hui
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
        >
          7 derniers jours
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
        >
          30 derniers jours
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setDateRange({
              from: startOfMonth(new Date()),
              to: endOfMonth(new Date()),
            })
          }
        >
          Ce mois
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Chiffre d'affaires"
          value={formatCurrency(totalStats.totalVentes)}
          icon={<TrendingUp className="h-6 w-6" />}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Nombre de ventes"
          value={totalStats.nombreVentes}
          icon={<ShoppingCart className="h-6 w-6" />}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Panier moyen"
          value={formatCurrency(totalStats.moyenneVente)}
          icon={<Package className="h-6 w-6" />}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
      </div>

      <Tabs defaultValue="chart" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chart">Graphique</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Évolution des ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Ventes"]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Aucune donnée pour cette période
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Top produits</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topProducts.slice(0, 5)}
                        dataKey="montant"
                        nameKey="nom"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ nom }) => nom.substring(0, 10)}
                      >
                        {topProducts.slice(0, 5).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Aucune donnée pour cette période
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Classement des produits</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.code_modele}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-mono">{product.code_modele}</TableCell>
                      <TableCell>{product.nom}</TableCell>
                      <TableCell className="text-right">{product.quantite}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.montant)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucune vente pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Résumé de la période</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Période</p>
                  <p className="font-semibold">
                    {format(dateRange.from, "dd MMMM yyyy", { locale: fr })} -{" "}
                    {format(dateRange.to, "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Jours actifs</p>
                  <p className="font-semibold">{dailyStats.length} jours</p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Total des ventes</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(totalStats.totalVentes)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
