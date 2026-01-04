import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Save, Printer, CheckCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, getTodayDate, TAILLES, Taille } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface WorkPlanLine {
  id: string;
  product_id: string;
  taille: Taille;
  quantite_initiale: number;
  quantite_vendue: number;
  quantite_restante: number;
  prix_unitaire: number;
  prix_total: number;
  product: {
    code_modele: string;
    nom: string;
    image_url: string | null;
  };
}

interface WorkPlan {
  id: string;
  date_travail: string;
  cloture: boolean;
  lines: WorkPlanLine[];
}

export default function PlanTravail() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workPlan, setWorkPlan] = useState<WorkPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedLines, setEditedLines] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const dateString = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    loadWorkPlan();
  }, [dateString]);

  const loadWorkPlan = async () => {
    setLoading(true);
    try {
      // Check if work plan exists for this date
      let { data: planData } = await supabase
        .from("daily_work_plans")
        .select("*")
        .eq("date_travail", dateString)
        .single();

      if (!planData) {
        // Create new work plan for today
        const { data: newPlan, error: createError } = await supabase
          .from("daily_work_plans")
          .insert({
            date_travail: dateString,
            employe_id: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        planData = newPlan;

        // Create lines from current stock
        const { data: stockData } = await supabase
          .from("stock")
          .select(`
            product_id,
            taille,
            quantite_actuelle,
            products!inner (
              id,
              code_modele,
              nom,
              prix_unitaire,
              actif
            )
          `)
          .gt("quantite_actuelle", 0);

        if (stockData && stockData.length > 0) {
          const lines = stockData
            .filter((s: any) => s.products?.actif)
            .map((s: any) => ({
              work_plan_id: newPlan.id,
              product_id: s.product_id,
              taille: s.taille,
              quantite_initiale: s.quantite_actuelle,
              quantite_vendue: 0,
              prix_unitaire: s.products.prix_unitaire,
            }));

          if (lines.length > 0) {
            await supabase.from("work_plan_lines").insert(lines);
          }
        }
      }

      // Load work plan lines
      const { data: linesData } = await supabase
        .from("work_plan_lines")
        .select(`
          *,
          products (code_modele, nom, image_url)
        `)
        .eq("work_plan_id", planData.id)
        .order("products(code_modele)");

      setWorkPlan({
        id: planData.id,
        date_travail: planData.date_travail,
        cloture: planData.cloture,
        lines: (linesData || []).map((line: any) => ({
          ...line,
          product: line.products,
        })),
      });
    } catch (error) {
      console.error("Error loading work plan:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le plan de travail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (lineId: string, value: string) => {
    const qty = parseInt(value) || 0;
    setEditedLines({ ...editedLines, [lineId]: qty });
  };

  const saveChanges = async () => {
    if (!workPlan || Object.keys(editedLines).length === 0) return;

    setSaving(true);
    try {
      for (const [lineId, quantite_vendue] of Object.entries(editedLines)) {
        const { error } = await supabase
          .from("work_plan_lines")
          .update({ quantite_vendue })
          .eq("id", lineId);

        if (error) throw error;

        // Update stock
        const line = workPlan.lines.find((l) => l.id === lineId);
        if (line) {
          await supabase
            .from("stock")
            .update({
              quantite_actuelle: line.quantite_initiale - quantite_vendue,
            })
            .eq("product_id", line.product_id)
            .eq("taille", line.taille);
        }
      }

      toast({ title: "Modifications enregistrées" });
      setEditedLines({});
      loadWorkPlan();
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const closePlan = async () => {
    if (!workPlan) return;

    try {
      // Save any pending changes first
      if (Object.keys(editedLines).length > 0) {
        await saveChanges();
      }

      // Create sales record
      const totalMontant = workPlan.lines.reduce((sum, line) => {
        const vendu = editedLines[line.id] ?? line.quantite_vendue;
        return sum + vendu * line.prix_unitaire;
      }, 0);

      if (totalMontant > 0) {
        const { data: sale, error: saleError } = await supabase
          .from("sales")
          .insert({
            work_plan_id: workPlan.id,
            employe_id: user?.id,
            montant_total: totalMontant,
            mode_paiement: "especes",
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Create sale items
        const saleItems = workPlan.lines
          .filter((line) => {
            const vendu = editedLines[line.id] ?? line.quantite_vendue;
            return vendu > 0;
          })
          .map((line) => ({
            sale_id: sale.id,
            product_id: line.product_id,
            taille: line.taille,
            quantite: editedLines[line.id] ?? line.quantite_vendue,
            prix_unitaire: line.prix_unitaire,
          }));

        if (saleItems.length > 0) {
          await supabase.from("sale_items").insert(saleItems);
        }
      }

      // Mark plan as closed
      await supabase
        .from("daily_work_plans")
        .update({ cloture: true })
        .eq("id", workPlan.id);

      toast({ title: "Plan de travail clôturé", description: "Les ventes ont été enregistrées" });
      loadWorkPlan();
    } catch (error) {
      console.error("Error closing plan:", error);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer le plan",
        variant: "destructive",
      });
    }
  };

  const getLineValue = (line: WorkPlanLine, field: "quantite_vendue") => {
    if (field === "quantite_vendue" && editedLines[line.id] !== undefined) {
      return editedLines[line.id];
    }
    return line[field];
  };

  const calculateTotals = () => {
    if (!workPlan) return { totalVendu: 0, totalMontant: 0 };

    return workPlan.lines.reduce(
      (acc, line) => {
        const vendu = getLineValue(line, "quantite_vendue");
        return {
          totalVendu: acc.totalVendu + vendu,
          totalMontant: acc.totalMontant + vendu * line.prix_unitaire,
        };
      },
      { totalVendu: 0, totalMontant: 0 }
    );
  };

  const totals = calculateTotals();

  // Group lines by product
  const groupedLines = workPlan?.lines.reduce((acc, line) => {
    const key = line.product_id;
    if (!acc[key]) {
      acc[key] = {
        product: line.product,
        prix_unitaire: line.prix_unitaire,
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {} as Record<string, { product: WorkPlanLine["product"]; prix_unitaire: number; lines: WorkPlanLine[] }>);

  return (
    <AppLayout>
      <PageHeader
        title="Plan de Travail"
        description="Enregistrez les ventes de la journée"
        actions={
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Articles vendus</p>
            <p className="text-2xl font-bold font-display">{totals.totalVendu}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
            <p className="text-2xl font-bold font-display text-primary">
              {formatCurrency(totals.totalMontant)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Statut</p>
            <Badge
              variant={workPlan?.cloture ? "default" : "secondary"}
              className="mt-1"
            >
              {workPlan?.cloture ? "Clôturé" : "En cours"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Work Plan Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Détail des produits</CardTitle>
          <div className="flex gap-2">
            {Object.keys(editedLines).length > 0 && !workPlan?.cloture && (
              <Button
                onClick={saveChanges}
                disabled={saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
            {!workPlan?.cloture && dateString === getTodayDate() && (
              <Button
                variant="outline"
                onClick={closePlan}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Clôturer la journée
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !groupedLines || Object.keys(groupedLines).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun produit en stock pour cette date
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead className="text-center">Initial</TableHead>
                    <TableHead className="text-center">Vendu</TableHead>
                    <TableHead className="text-center">Restant</TableHead>
                    <TableHead className="text-right">Prix Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(groupedLines).map((group) =>
                    group.lines.map((line, idx) => {
                      const vendu = getLineValue(line, "quantite_vendue");
                      const restant = line.quantite_initiale - vendu;
                      const total = vendu * line.prix_unitaire;

                      return (
                        <TableRow key={line.id}>
                          {idx === 0 && (
                            <>
                              <TableCell
                                rowSpan={group.lines.length}
                                className="font-mono font-bold"
                              >
                                {group.product.code_modele}
                              </TableCell>
                              <TableCell rowSpan={group.lines.length}>
                                {group.product.nom}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant="outline">{line.taille}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {line.quantite_initiale}
                          </TableCell>
                          <TableCell className="text-center">
                            {workPlan?.cloture ? (
                              line.quantite_vendue
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={line.quantite_initiale}
                                value={vendu}
                                onChange={(e) =>
                                  handleQuantityChange(line.id, e.target.value)
                                }
                                className="w-20 text-center mx-auto"
                              />
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-center font-medium",
                              restant <= 0 && "text-destructive"
                            )}
                          >
                            {restant}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.prix_unitaire)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
