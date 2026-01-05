import { useState, useEffect, useMemo } from "react";
import { Plus, ShoppingCart, Minus, Trash2, CreditCard, Search } from "lucide-react";
import { StockIndicator } from "@/components/StockIndicator";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, MODES_PAIEMENT, ModePaiement, Taille, getTodayDate } from "@/lib/constants";

interface Product {
  id: string;
  code_modele: string;
  nom: string;
  prix_unitaire: number;
  image_url: string | null;
  stock: { taille: Taille; quantite_actuelle: number }[];
}

interface CartItem {
  product: Product;
  taille: Taille;
  quantite: number;
  prix_unitaire: number;
}

interface Sale {
  id: string;
  date_vente: string;
  montant_total: number;
  mode_paiement: string;
  sale_items: {
    quantite: number;
    prix_total: number;
    products: { nom: string; code_modele: string };
    taille: string;
  }[];
}

export default function Ventes() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [modePaiement, setModePaiement] = useState<ModePaiement>("especes");
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
    loadRecentSales();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, code_modele, nom, prix_unitaire, image_url,
          stock (taille, quantite_actuelle)
        `)
        .eq("actif", true)
        .order("nom");

      if (error) throw error;
      setProducts((data || []).filter((p) => p.stock && p.stock.length > 0));
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select(`
        id, date_vente, montant_total, mode_paiement,
        sale_items (quantite, prix_total, taille, products (nom, code_modele))
      `)
      .order("date_vente", { ascending: false })
      .limit(10);

    setRecentSales(data || []);
  };

  const addToCart = (product: Product, taille: Taille) => {
    const stockItem = product.stock.find((s) => s.taille === taille);
    if (!stockItem || stockItem.quantite_actuelle <= 0) {
      toast({
        title: "Stock épuisé",
        description: `${product.nom} en taille ${taille} n'est plus disponible`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(
      (item) => item.product.id === product.id && item.taille === taille
    );

    if (existingItem) {
      if (existingItem.quantite >= stockItem.quantite_actuelle) {
        toast({
          title: "Limite atteinte",
          description: "Stock insuffisant pour cette quantité",
          variant: "destructive",
        });
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id && item.taille === taille
            ? { ...item, quantite: item.quantite + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          taille,
          quantite: 1,
          prix_unitaire: product.prix_unitaire,
        },
      ]);
    }

    toast({ title: `${product.nom} (${taille}) ajouté au panier` });
  };

  const updateQuantity = (productId: string, taille: Taille, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId && item.taille === taille) {
            const newQty = item.quantite + delta;
            if (newQty <= 0) return null;
            return { ...item, quantite: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string, taille: Taille) => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.taille === taille)));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.quantite * item.prix_unitaire, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      // Get or create today's work plan
      const today = getTodayDate();
      let { data: workPlan } = await supabase
        .from("daily_work_plans")
        .select("id")
        .eq("date_travail", today)
        .single();

      if (!workPlan) {
        const { data: newPlan } = await supabase
          .from("daily_work_plans")
          .insert({ date_travail: today, employe_id: user?.id })
          .select()
          .single();
        workPlan = newPlan;
      }

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          work_plan_id: workPlan?.id,
          employe_id: user?.id,
          montant_total: getCartTotal(),
          mode_paiement: modePaiement,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        taille: item.taille,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
      }));

      await supabase.from("sale_items").insert(saleItems);

      // Update stock
      for (const item of cart) {
        const { data: currentStock } = await supabase
          .from("stock")
          .select("quantite_actuelle")
          .eq("product_id", item.product.id)
          .eq("taille", item.taille)
          .single();

        if (currentStock) {
          await supabase
            .from("stock")
            .update({
              quantite_actuelle: currentStock.quantite_actuelle - item.quantite,
            })
            .eq("product_id", item.product.id)
            .eq("taille", item.taille);
        }
      }

      toast({
        title: "Vente enregistrée !",
        description: `Total: ${formatCurrency(getCartTotal())}`,
      });

      setCart([]);
      setIsCheckoutOpen(false);
      loadProducts();
      loadRecentSales();
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la vente",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const availableSizes = (product: Product) => {
    return product.stock
      .filter((s) => s.quantite_actuelle > 0)
      .map((s) => s.taille);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.nom.toLowerCase().includes(query) ||
        p.code_modele.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  return (
    <AppLayout>
      <PageHeader
        title="Ventes"
        description="Enregistrez une nouvelle vente"
        actions={
          cart.length > 0 && (
            <Button
              className="gradient-primary text-primary-foreground gap-2"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              Panier ({cart.length}) - {formatCurrency(getCartTotal())}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>Produits disponibles</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="h-8 w-8" />}
                  title={searchQuery ? "Aucun résultat" : "Aucun produit"}
                  description={searchQuery ? "Aucun produit ne correspond à votre recherche" : "Ajoutez des produits avec du stock pour commencer"}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => {
                    const totalStock = product.stock.reduce((sum, s) => sum + s.quantite_actuelle, 0);
                    return (
                      <div
                        key={product.id}
                        className="border rounded-lg p-3 hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-mono text-xs text-muted-foreground">
                            {product.code_modele}
                          </p>
                          <StockIndicator totalStock={totalStock} size="sm" />
                        </div>
                        <p className="font-medium truncate">{product.nom}</p>
                        <p className="text-primary font-bold text-sm mb-2">
                          {formatCurrency(product.prix_unitaire)}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {availableSizes(product).map((taille) => (
                            <Button
                              key={taille}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => addToCart(product, taille)}
                            >
                              {taille}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div>
          <Card className="shadow-card sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Panier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Panier vide
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={`${item.product.id}-${item.taille}`}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.nom}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{item.taille}</Badge>
                          <span>{formatCurrency(item.prix_unitaire)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.taille, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantite}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.taille, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.product.id, item.taille)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(getCartTotal())}
                      </span>
                    </div>
                    <Button
                      className="w-full gradient-primary text-primary-foreground"
                      onClick={() => setIsCheckoutOpen(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Valider la vente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finaliser la vente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={modePaiement} onValueChange={(v) => setModePaiement(v as ModePaiement)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES_PAIEMENT.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total à payer</span>
                <span className="text-primary">{formatCurrency(getCartTotal())}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsCheckoutOpen(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={handleCheckout}
                disabled={processing}
              >
                {processing ? "Traitement..." : "Confirmer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
