import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  CreditCard
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime, MODES_PAIEMENT } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SaleItem {
  id: string;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  taille: string;
  products: {
    nom: string;
    code_modele: string;
  };
}

interface Sale {
  id: string;
  date_vente: string;
  montant_total: number;
  mode_paiement: string;
  notes: string | null;
  employe_id: string | null;
  sale_items: SaleItem[];
  profiles?: {
    nom_complet: string;
  } | null;
}

type SortField = "date" | "total" | "items";
type SortDirection = "asc" | "desc";

export default function ListeVentes() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { toast } = useToast();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          date_vente,
          montant_total,
          mode_paiement,
          notes,
          employe_id,
          sale_items (
            id,
            quantite,
            prix_unitaire,
            prix_total,
            taille,
            products (nom, code_modele)
          )
        `)
        .order("date_vente", { ascending: false });

      if (error) throw error;

      // Fetch profiles for employee names
      const employeeIds = [...new Set((data || []).map(s => s.employe_id).filter(Boolean))];
      let profiles: Record<string, string> = {};
      
      if (employeeIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, nom_complet")
          .in("user_id", employeeIds);
        
        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = p.nom_complet;
          return acc;
        }, {} as Record<string, string>);
      }

      // Map profiles to sales
      const salesWithProfiles = (data || []).map(sale => ({
        ...sale,
        profiles: sale.employe_id && profiles[sale.employe_id] 
          ? { nom_complet: profiles[sale.employe_id] }
          : null
      }));

      setSales(salesWithProfiles);
    } catch (error) {
      console.error("Error loading sales:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les ventes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSales = useMemo(() => {
    let result = [...sales];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(sale => 
        sale.sale_items.some(item => 
          item.products.nom.toLowerCase().includes(query) ||
          item.products.code_modele.toLowerCase().includes(query)
        ) ||
        sale.profiles?.nom_complet?.toLowerCase().includes(query)
      );
    }

    // Filter by payment method
    if (paymentFilter !== "all") {
      result = result.filter(sale => sale.mode_paiement === paymentFilter);
    }

    // Filter by date range
    if (dateFrom) {
      result = result.filter(sale => new Date(sale.date_vente) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(sale => new Date(sale.date_vente) <= endOfDay);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.date_vente).getTime() - new Date(b.date_vente).getTime();
          break;
        case "total":
          comparison = a.montant_total - b.montant_total;
          break;
        case "items":
          comparison = a.sale_items.reduce((s, i) => s + i.quantite, 0) - 
                       b.sale_items.reduce((s, i) => s + i.quantite, 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [sales, searchQuery, paymentFilter, dateFrom, dateTo, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const getPaymentLabel = (value: string) => {
    return MODES_PAIEMENT.find(m => m.value === value)?.label || value;
  };

  const getTotalItems = (sale: Sale) => {
    return sale.sale_items.reduce((sum, item) => sum + item.quantite, 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // Create CSV data
    const headers = ["Date", "Employé", "Produit", "Taille", "Quantité", "Prix unitaire", "Total", "Mode de paiement"];
    const rows = filteredAndSortedSales.flatMap(sale =>
      sale.sale_items.map(item => [
        formatDateTime(sale.date_vente),
        sale.profiles?.nom_complet || "—",
        `${item.products.code_modele} - ${item.products.nom}`,
        item.taille,
        item.quantite.toString(),
        item.prix_unitaire.toString(),
        (item.prix_total || item.quantite * item.prix_unitaire).toString(),
        getPaymentLabel(sale.mode_paiement)
      ])
    );

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");

    // Add BOM for UTF-8 encoding in Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ventes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({ title: "Export effectué", description: "Le fichier a été téléchargé" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPaymentFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Summary stats
  const totalRevenue = filteredAndSortedSales.reduce((sum, s) => sum + s.montant_total, 0);
  const totalSales = filteredAndSortedSales.length;
  const totalItemsSold = filteredAndSortedSales.reduce((sum, s) => 
    sum + s.sale_items.reduce((is, i) => is + i.quantite, 0), 0
  );

  return (
    <AppLayout className="print-landscape">
      <PageHeader
        title="Liste des Ventes"
        description="Historique complet des ventes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="no-print">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="no-print">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 print-only:hidden">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total ventes</p>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Articles vendus</p>
            <p className="text-2xl font-bold">{totalItemsSold}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card mb-6 no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher produit, employé..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Payment filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <CreditCard className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Mode paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                {MODES_PAIEMENT.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date from */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Date début"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            {/* Date to */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Date fin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            {/* Clear filters */}
            {(searchQuery || paymentFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" onClick={clearFilters}>
                Effacer filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="shadow-card">
        <CardHeader className="no-print">
          <CardTitle>
            {filteredAndSortedSales.length} vente{filteredAndSortedSales.length !== 1 ? "s" : ""} trouvée{filteredAndSortedSales.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredAndSortedSales.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-8 w-8" />}
              title="Aucune vente"
              description={searchQuery || paymentFilter !== "all" || dateFrom || dateTo 
                ? "Aucune vente ne correspond aux critères" 
                : "Aucune vente enregistrée"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 hover:bg-transparent"
                        onClick={() => handleSort("date")}
                      >
                        Date {getSortIcon("date")}
                      </Button>
                    </TableHead>
                    <TableHead>Employé</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        className="p-0 hover:bg-transparent"
                        onClick={() => handleSort("items")}
                      >
                        Qté {getSortIcon("items")}
                      </Button>
                    </TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        className="p-0 hover:bg-transparent"
                        onClick={() => handleSort("total")}
                      >
                        Total {getSortIcon("total")}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(sale.date_vente)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{sale.profiles?.nom_complet || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sale.sale_items.map((item) => (
                            <div key={item.id} className="text-sm">
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.products.code_modele}
                              </span>
                              {" "}
                              <span>{item.products.nom}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {item.taille}
                              </Badge>
                              <span className="text-muted-foreground"> x{item.quantite}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {getTotalItems(sale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getPaymentLabel(sale.mode_paiement)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(sale.montant_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
