'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/database/supabase/client";

interface UserProfile {
  id: string;
  username: string | null;
  email: string | null; // Note: email might be in User model, not Profile. Need to handle this.
  role: string;
  level: number;
  created_at: string;
}

interface Visit {
  id: string;
  poi: { title: string };
  entryTime: string;
  durationSeconds: number | null;
  rating: number | null;
}

export function UsersTable({ profiles, theme }: { profiles: any[], theme?: any }) {
  const activeTheme = theme || {
    text: "text-[#2D4636]",
    mainText: "text-[#2D4636]/80",
    bg: "bg-[#2D4636]/10",
    primary: "bg-[#2D4636]",
    hover: "hover:bg-[#1E2F24]",
  };
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  const handleUserClick = async (user: any) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
    setIsLoadingVisits(true);
    setVisits([]);

    try {
      // Fetch visits for this user
      // Note: This assumes we can query poi_visits directly via Supabase client 
      // or we might need a server action if RLS prevents it.
      // For now, attempting client-side fetch.
      const { data, error } = await supabase
        .from('poi_visits')
        .select(`
          id,
          entry_time,
          duration_seconds,
          rating,
          poi:pois(title)
        `)
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false });

      if (error) {
        console.error("Error fetching visits:", error);
      } else {
        setVisits(data.map((v: any) => ({
          id: v.id,
          poi: v.poi,
          entryTime: v.entry_time,
          durationSeconds: v.duration_seconds,
          rating: v.rating
        })));
      }
    } catch (e) {
      console.error("Exception fetching visits:", e);
    } finally {
      setIsLoadingVisits(false);
    }
  };

  return (
    <Card className="border-stone-200 shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="font-serif text-xl text-stone-800">Directori d'Usuaris</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-stone-200">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-serif text-stone-700">Usuari</TableHead>
                <TableHead className="font-serif text-stone-700">Email</TableHead>
                <TableHead className="font-serif text-stone-700">Nivell</TableHead>
                <TableHead className="font-serif text-stone-700 text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((profile) => (
                <TableRow key={profile.id} className="hover:bg-stone-50/50 cursor-pointer" onClick={() => handleUserClick(profile)}>
                  <TableCell className="font-medium text-stone-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${activeTheme.bg} flex items-center justify-center ${activeTheme.text} font-bold text-xs`}>
                        {profile.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      {profile.username || 'Anònim'}
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-600">{profile.email || '-'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                      Lvl {profile.level || 1}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className={`${activeTheme.mainText} ${activeTheme.hover} ${activeTheme.bg}`}>
                      Veure Detalls
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!profiles || profiles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-stone-500">
                    No s'han trobat usuaris.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-stone-800">
              Activitat de {selectedUser?.username || 'Usuari'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Historial de visites als Punts d'Interès.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {isLoadingVisits ? (
              <div className="py-8 text-center text-stone-400">Carregant historial...</div>
            ) : visits.length > 0 ? (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div key={visit.id} className="flex items-start justify-between p-4 rounded-lg bg-stone-50 border border-stone-100">
                    <div>
                      <h4 className="font-medium text-stone-800">{visit.poi?.title || 'POI Desconegut'}</h4>
                      <p className="text-xs text-stone-500 mt-1">
                        {new Date(visit.entryTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${activeTheme.mainText}`}>
                        {visit.durationSeconds ? `${Math.floor(visit.durationSeconds / 60)} min` : 'En curs'}
                      </div>
                      {visit.rating && (
                        <div className="text-xs text-amber-500 mt-1">
                          {'★'.repeat(visit.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-stone-400 border-2 border-dashed border-stone-100 rounded-lg">
                Aquest usuari encara no ha visitat cap ruta.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
