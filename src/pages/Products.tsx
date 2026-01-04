import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Package, ImageIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, TAILLES, Taille } from "@/lib/constants";

interface Product {
  id: string;
  code_modele: string;
  nom: string;
  description: string | null;
  categorie_id: string | null;
  prix_unitaire: number;
  image_url: string | null;
  actif: boolean;
  categories?: { nom: string } | null;
  stock?: { taille: string; quantite_actuelle: number }[];
}

interface Category {
  id: string;
  nom: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code_modele: "",
    nom: "",
    description: "",
    categorie_id: "",
    prix_unitaire: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stockData, setStockData] = useState<Record<Taille, string>>({
    XS: "0", S: "0", M: "0", L: "0", XL: "0", XXL: "0", "3XL": "0", "4XL": "0", "5XL": "0"
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (nom),
          stock (taille, quantite_actuelle)
        `)
        .eq("actif", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("nom");
    setCategories(data || []);
  };

  const resetForm = () => {
    setFormData({
      code_modele: "",
      nom: "",
      description: "",
      categorie_id: "",
      prix_unitaire: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setStockData({
      XS: "0", S: "0", M: "0", L: "0", XL: "0", XXL: "0", "3XL": "0", "4XL": "0", "5XL": "0"
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code_modele: product.code_modele,
      nom: product.nom,
      description: product.description || "",
      categorie_id: product.categorie_id || "",
      prix_unitaire: product.prix_unitaire.toString(),
    });
    setImagePreview(product.image_url);
    
    // Set stock data
    const newStockData: Record<Taille, string> = {
      XS: "0", S: "0", M: "0", L: "0", XL: "0", XXL: "0", "3XL": "0", "4XL": "0", "5XL": "0"
    };
    product.stock?.forEach((s) => {
      if (TAILLES.includes(s.taille as Taille)) {
        newStockData[s.taille as Taille] = s.quantite_actuelle.toString();
      }
    });
    setStockData(newStockData);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code_modele || !formData.nom || !formData.prix_unitaire) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert image file to base64 data URL if present
      let imageUrl: string | null = imagePreview;
      
      if (imageFile) {
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      const productData = {
        code_modele: formData.code_modele,
        nom: formData.nom,
        description: formData.description || null,
        categorie_id: formData.categorie_id || null,
        prix_unitaire: parseInt(formData.prix_unitaire),
        image_url: imageUrl,
      };

      if (editingProduct) {
        // Update product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;

        // Update stock
        for (const taille of TAILLES) {
          const qty = parseInt(stockData[taille]) || 0;
          const { error: stockError } = await supabase
            .from("stock")
            .upsert({
              product_id: editingProduct.id,
              taille,
              quantite_initiale: qty,
              quantite_actuelle: qty,
            }, { onConflict: "product_id,taille" });

          if (stockError) console.error("Stock error:", stockError);
        }

        toast({ title: "Produit modifié avec succès" });
      } else {
        // Create product
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        // Create stock entries
        const stockEntries = TAILLES
          .filter((taille) => parseInt(stockData[taille]) > 0)
          .map((taille) => ({
            product_id: newProduct.id,
            taille,
            quantite_initiale: parseInt(stockData[taille]),
            quantite_actuelle: parseInt(stockData[taille]),
          }));

        if (stockEntries.length > 0) {
          await supabase.from("stock").insert(stockEntries);
        }

        toast({ title: "Produit créé avec succès" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Erreur",
        description: error.message?.includes("duplicate")
          ? "Ce code modèle existe déjà"
          : "Impossible de sauvegarder le produit",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteProductId) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({ actif: false })
        .eq("id", deleteProductId);

      if (error) throw error;

      toast({ title: "Produit supprimé" });
      setDeleteProductId(null);
      loadProducts();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code_modele.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalStock = (product: Product) => {
    return product.stock?.reduce((sum, s) => sum + s.quantite_actuelle, 0) || 0;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Produits"
        description="Gérez votre catalogue de produits"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" />
                Nouveau produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Modifier le produit" : "Nouveau produit"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_modele">Code modèle *</Label>
                    <Input
                      id="code_modele"
                      placeholder="CF01"
                      value={formData.code_modele}
                      onChange={(e) =>
                        setFormData({ ...formData, code_modele: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom du produit *</Label>
                    <Input
                      id="nom"
                      placeholder="Chemise Fleurie"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categorie">Catégorie</Label>
                    <Select
                      value={formData.categorie_id}
                      onValueChange={(value) => setFormData({ ...formData, categorie_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix">Prix unitaire (GNF) *</Label>
                    <Input
                      id="prix"
                      type="number"
                      placeholder="150000"
                      value={formData.prix_unitaire}
                      onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Photo du produit</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formats: JPG, PNG, WEBP
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Stock par taille</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {TAILLES.map((taille) => (
                      <div key={taille} className="space-y-1">
                        <Label className="text-xs text-center block">{taille}</Label>
                        <Input
                          type="number"
                          min="0"
                          className="text-center"
                          value={stockData[taille]}
                          onChange={(e) =>
                            setStockData({ ...stockData, [taille]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="gradient-primary text-primary-foreground">
                    {editingProduct ? "Enregistrer" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou code..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="Aucun produit"
          description="Commencez par ajouter votre premier produit"
          action={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="shadow-card overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.nom}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => setDeleteProductId(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Badge className="absolute top-2 left-2 bg-primary">
                  {product.code_modele}
                </Badge>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {product.categories?.nom || "Sans catégorie"}
                </p>
                <h3 className="font-semibold truncate">{product.nom}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-primary">
                    {formatCurrency(product.prix_unitaire)}
                  </p>
                  <Badge variant={getTotalStock(product) > 5 ? "secondary" : "destructive"}>
                    Stock: {getTotalStock(product)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit sera désactivé et ne sera plus visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
