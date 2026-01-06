import { useState } from "react";
import { Moon, Sun, User, Database, Info } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, CURRENCY } from "@/lib/constants";
import { CategoryManager } from "@/components/CategoryManager";
import ActivityLogViewer from "@/components/ActivityLogViewer";

export default function Parametres() {
  const { profile, userRole, user } = useAuth();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
  const [saving, setSaving] = useState(false);

  // Profile form
  const [nomComplet, setNomComplet] = useState(profile?.nom_complet || "");
  const [telephone, setTelephone] = useState(profile?.telephone || "");
  const [pinCode, setPinCode] = useState("");

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update profile info (without PIN)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nom_complet: nomComplet,
          telephone: telephone || null,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // If PIN is provided, use the secure server-side function to hash and store it
      if (pinCode && pinCode.length >= 4) {
        const { error: pinError } = await supabase.rpc("set_pin_code", {
          user_id_param: user.id,
          new_pin: pinCode,
        });

        if (pinError) {
          console.error("Error setting PIN:", pinError);
          toast({
            title: "Erreur",
            description: "Impossible de définir le code PIN",
            variant: "destructive",
          });
          return;
        }
      }

      toast({ title: "Profil mis à jour" });
      setPinCode("");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Paramètres"
        description="Configurez votre application"
      />

      <div className="space-y-6">
        {/* Activity Log (Owner only) - Full width */}
        {userRole === "proprietaire" && <ActivityLogViewer />}

        <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Mon profil
            </CardTitle>
            <CardDescription>
              Modifiez vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom">Nom complet</Label>
              <Input
                id="nom"
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+224 XXX XXX XXX"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="pin">
                Code PIN (pour connexion rapide)
                {profile?.has_pin_code && (
                  <span className="ml-2 text-xs text-success">(déjà configuré)</span>
                )}
              </Label>
              <Input
                id="pin"
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder={profile?.has_pin_code ? "Nouveau code PIN (laisser vide pour garder)" : "Minimum 4 chiffres"}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Le code PIN est stocké de manière sécurisée (haché)
              </p>
            </div>

            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l'affichage de l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode sombre</Label>
                <p className="text-sm text-muted-foreground">
                  Activer le thème sombre
                </p>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">{APP_NAME}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monnaie</span>
              <span className="font-medium">{CURRENCY}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium capitalize">
                {userRole === "proprietaire" ? "Propriétaire" : "Employé"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Category Management (Owner only) */}
        {userRole === "proprietaire" && <CategoryManager />}

        {/* Data Management (Owner only) */}
        {userRole === "proprietaire" && (
          <Card className="shadow-card border-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Database className="h-5 w-5" />
                Gestion des données
              </CardTitle>
              <CardDescription>
                Options avancées (propriétaire uniquement)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Exporter toutes les données
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Téléchargez une sauvegarde complète de vos données
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
