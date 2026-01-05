import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Store, 
  UserCheck,
  Loader2,
  RefreshCw
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/constants";

interface UserData {
  id: string;
  email: string;
  nom_complet: string;
  telephone: string | null;
  role: AppRole;
  created_at: string;
}

export default function Utilisateurs() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserNom, setNewUserNom] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("employe");

  // Edit user dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editTelephone, setEditTelephone] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("employe");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setUsers(response.data?.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserNom) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create',
          email: newUserEmail,
          password: newUserPassword,
          nom_complet: newUserNom,
          role: newUserRole
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la création');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Succès",
        description: `Utilisateur ${newUserNom} créé avec succès`,
      });

      setCreateDialogOpen(false);
      resetCreateForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editNom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update_profile',
          user_id: editingUser.id,
          nom_complet: editNom.trim(),
          telephone: editTelephone.trim() || null,
          new_role: editRole
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la modification');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Succès",
        description: `Utilisateur ${editNom} modifié avec succès`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete',
          user_id: deletingUser.id
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la suppression');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Succès",
        description: `Utilisateur ${deletingUser.nom_complet} supprimé`,
      });

      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserNom("");
    setNewUserRole("employe");
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditNom(user.nom_complet);
    setEditTelephone(user.telephone || "");
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserData) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground">Créez et gérez les comptes de vos employés</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              className="gradient-primary text-primary-foreground"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs ({users.length})
            </CardTitle>
            <CardDescription>
              Liste de tous les utilisateurs avec leurs rôles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.nom_complet}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'proprietaire' ? 'default' : 'secondary'}
                            className={user.role === 'proprietaire' ? 'bg-primary' : ''}
                          >
                            {user.role === 'proprietaire' ? (
                              <><Store className="h-3 w-3 mr-1" /> Propriétaire</>
                            ) : (
                              <><UserCheck className="h-3 w-3 mr-1" /> Employé</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              disabled={user.id === currentUser?.id}
                              title={user.id === currentUser?.id ? "Vous ne pouvez pas modifier votre propre rôle" : "Modifier le rôle"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openDeleteDialog(user)}
                              disabled={user.id === currentUser?.id}
                              className="text-destructive hover:text-destructive"
                              title={user.id === currentUser?.id ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
              <DialogDescription>
                Créez un nouveau compte pour un employé ou propriétaire
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom complet</Label>
                <Input
                  id="nom"
                  placeholder="Ex: Jean Dupont"
                  value={newUserNom}
                  onChange={(e) => setNewUserNom(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="utilisateur@email.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de compte</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewUserRole("employe")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      newUserRole === "employe"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={actionLoading}
                  >
                    <UserCheck className="h-5 w-5 mx-auto mb-2" />
                    <p className="font-medium text-sm">Employé</p>
                    <p className="text-xs text-muted-foreground">Accès limité</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole("proprietaire")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      newUserRole === "proprietaire"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={actionLoading}
                  >
                    <Store className="h-5 w-5 mx-auto mb-2" />
                    <p className="font-medium text-sm">Propriétaire</p>
                    <p className="text-xs text-muted-foreground">Accès complet</p>
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetCreateForm();
                }}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={actionLoading}
                className="gradient-primary text-primary-foreground"
              >
                {actionLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Créer</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                Modifiez les informations de {editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom complet</Label>
                <Input
                  id="edit-nom"
                  placeholder="Ex: Jean Dupont"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telephone">Téléphone</Label>
                <Input
                  id="edit-telephone"
                  type="tel"
                  placeholder="Ex: +224 620 00 00 00"
                  value={editTelephone}
                  onChange={(e) => setEditTelephone(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole("employe")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      editRole === "employe"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={actionLoading || editingUser?.id === currentUser?.id}
                  >
                    <UserCheck className="h-5 w-5 mx-auto mb-2" />
                    <p className="font-medium text-sm">Employé</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole("proprietaire")}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      editRole === "proprietaire"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={actionLoading || editingUser?.id === currentUser?.id}
                  >
                    <Store className="h-5 w-5 mx-auto mb-2" />
                    <p className="font-medium text-sm">Propriétaire</p>
                  </button>
                </div>
                {editingUser?.id === currentUser?.id && (
                  <p className="text-xs text-muted-foreground">Vous ne pouvez pas modifier votre propre rôle</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mise à jour...</>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer <strong>{deletingUser?.nom_complet}</strong> ({deletingUser?.email}) ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Suppression...</>
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" /> Supprimer</>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
