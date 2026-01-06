import { useState, useEffect } from "react";
import { 
  History, 
  Download, 
  RefreshCw, 
  Loader2,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  Edit,
  Ban,
  CheckCircle,
  Key,
  Package,
  ShoppingCart,
  Trash2,
  FolderPlus,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: typeof History; color: string }> = {
  'login': { label: 'Connexion', icon: LogIn, color: 'bg-green-100 text-green-800' },
  'logout': { label: 'Déconnexion', icon: LogOut, color: 'bg-gray-100 text-gray-800' },
  'user_created': { label: 'Utilisateur créé', icon: UserPlus, color: 'bg-blue-100 text-blue-800' },
  'user_updated': { label: 'Utilisateur modifié', icon: Edit, color: 'bg-yellow-100 text-yellow-800' },
  'user_deleted': { label: 'Utilisateur supprimé', icon: UserMinus, color: 'bg-red-100 text-red-800' },
  'user_banned': { label: 'Utilisateur désactivé', icon: Ban, color: 'bg-orange-100 text-orange-800' },
  'user_unbanned': { label: 'Utilisateur réactivé', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  'password_changed': { label: 'Mot de passe changé', icon: Key, color: 'bg-purple-100 text-purple-800' },
  'product_created': { label: 'Produit créé', icon: Package, color: 'bg-blue-100 text-blue-800' },
  'product_updated': { label: 'Produit modifié', icon: Edit, color: 'bg-yellow-100 text-yellow-800' },
  'product_deleted': { label: 'Produit supprimé', icon: Trash2, color: 'bg-red-100 text-red-800' },
  'sale_created': { label: 'Vente créée', icon: ShoppingCart, color: 'bg-green-100 text-green-800' },
  'sale_deleted': { label: 'Vente supprimée', icon: Trash2, color: 'bg-red-100 text-red-800' },
  'stock_updated': { label: 'Stock modifié', icon: Layers, color: 'bg-yellow-100 text-yellow-800' },
  'category_created': { label: 'Catégorie créée', icon: FolderPlus, color: 'bg-blue-100 text-blue-800' },
  'category_updated': { label: 'Catégorie modifiée', icon: Edit, color: 'bg-yellow-100 text-yellow-800' },
  'category_deleted': { label: 'Catégorie supprimée', icon: Trash2, color: 'bg-red-100 text-red-800' },
};

export default function ActivityLogViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('activity-logs', {
        body: { 
          action: 'fetch',
          page,
          limit: 20,
          action_type: filterAction || undefined,
          start_date: startDate || undefined,
          end_date: endDate ? `${endDate}T23:59:59Z` : undefined
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setLogs(response.data?.logs || []);
      setTotalPages(response.data?.totalPages || 1);
      setTotal(response.data?.total || 0);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('activity-logs', {
        body: { 
          action: 'export',
          format: 'csv',
          start_date: startDate || undefined,
          end_date: endDate ? `${endDate}T23:59:59Z` : undefined
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Download CSV
      const csv = response.data?.csv;
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historique_activites_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Succès",
          description: "Historique téléchargé avec succès",
        });
      }
    } catch (error: any) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'exporter l'historique",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (actionType: string) => {
    const config = ACTION_LABELS[actionType] || { label: actionType, icon: History, color: 'bg-gray-100 text-gray-800' };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const resetFilters = () => {
    setFilterAction("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des activités
            </CardTitle>
            <CardDescription>
              Suivi complet des actions des utilisateurs ({total} entrées)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Télécharger CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Type d'action</Label>
            <Select value={filterAction} onValueChange={(value) => { setFilterAction(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date début</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            />
          </div>
          <div className="space-y-2">
            <Label>Date fin</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            />
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button variant="outline" onClick={resetFilters} className="w-full">
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucune activité trouvée</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell>
                        {log.entity_name && (
                          <span className="text-sm">
                            {log.entity_type && <span className="text-muted-foreground">{log.entity_type}: </span>}
                            {log.entity_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span title={JSON.stringify(log.details, null, 2)}>
                            {Object.entries(log.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
