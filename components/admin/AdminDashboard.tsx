'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AiRouteGenerator from '@/components/admin/AiRouteGenerator';
import { UsersTable } from '@/components/admin/UsersTable';
import ExecutiveReport from '@/components/admin/ExecutiveReport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, UploadCloud, AlertCircle, Plus, X, ImageIcon } from "lucide-react";
import { deleteLegend, createLegend, updateLegend, getAdminLegends, addVideoToPoi, createRoute, createPoi, updatePoi } from "@/lib/actions";
import { compressImage } from "@/lib/imageOptimization";
import { useRouter } from "next/navigation";
import { getAdminTheme } from "@/lib/adminTheme";
import VideoUploader from "./VideoUploader";
import ManualPoiForm from "./ManualPoiForm";
import { updateRoute } from "@/lib/actions";
import RoutePoiManager from "./RoutePoiManager";
import MunicipalityManager from "./MunicipalityManager";

interface Legend {
  id: string;
  title: string;
  description: string;
  category: string;
  location_name: string;
  latitude: number;
  longitude: number;
  image_url: string;
  hero_image_url: string;
  audio_url: string;
  video_url: string;
  routePois?: Poi[];
}

interface Poi {
  id: string;
  title: string;
  category?: string;
  videoUrls: string[];
}

export default function AdminDashboard({ legends: initialLegends, profiles, reports, municipalityId, municipalityTheme }: { legends: any[], profiles: any[], reports?: any[], municipalityId?: string, municipalityTheme?: string }) {
  const adminTheme = getAdminTheme(municipalityTheme);
  const [activeTab, setActiveTab] = useState('rutes');
  const [isLoading, setIsLoading] = useState(false);
  const [legends, setLegends] = useState<Legend[]>(initialLegends as any[]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [category, setCategory] = useState('mountain');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [editingLegend, setEditingLegend] = useState<Legend | null>(null);

  // Form State
  // Note: Original code used a Dialog. Now we want it in the right column (Split Screen).
  // We need state for the form fields if we want to "Edit".
  // For simplicity in this split-screen "Creation" focused view, we assume "New" by default,
  // but let's allow editing if someone clicks "Edit" in a list (which list? The legends list is needed).
  // Strategy: We will keep a "Legends List" below the split screen or in a separate view?
  // The user requirement says: "Columna esquerra: AiRouteGenerator... Columna dreta: Formulari".
  // It implies a workspace for CREATION.
  // But we also need to manage existing legends.
  // Let's create a mode in the "Rutes" tab: "List" vs "Workspace".
  // OR: Just show the workspace and a list below/modal.
  // Given "Split-Screen" emphasis for copying from AI, we prioritize the grid.

  const router = useRouter();

  // Route Form State
  const [routeTitle, setRouteTitle] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [routeLocation, setRouteLocation] = useState('');
  const [routeThumbnail, setRouteThumbnail] = useState('');
  const [routeCategory, setRouteCategory] = useState(municipalityTheme || 'mountain');
  const [routeDownloadRequired, setRouteDownloadRequired] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [managingRoute, setManagingRoute] = useState<{ id: string; name: string } | null>(null);
  const [editingPoi, setEditingPoi] = useState<any>(null);
  const [routeThumbFile, setRouteThumbFile] = useState<File | null>(null);

  // Handle initialization/edit sync
  useEffect(() => {
    if (editingLegend) {
      setEditingRoute(editingLegend);
      setRouteTitle(editingLegend.title || '');
      setRouteDescription(editingLegend.description || '');
      setRouteLocation(editingLegend.location_name || '');
      setRouteThumbnail((editingLegend as any).thumbnail1x1 || '');
      setRouteCategory(editingLegend.category || 'mountain');
      setRouteDownloadRequired((editingLegend as any).downloadRequired || false);
    }
  }, [editingLegend]);

  const resetRouteForm = () => {
    setEditingLegend(null);
    setEditingRoute(null);
    setEditingPoi(null);
    setRouteTitle('');
    setRouteDescription('');
    setRouteLocation('');
    setRouteThumbnail('');
    setRouteCategory(municipalityTheme || 'mountain');
    setRouteDownloadRequired(false);
    setRouteThumbFile(null);
  };

  async function handleSaveRoute() {
    if (!routeTitle) return alert('El títol de la ruta és obligatori.');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', routeTitle);
      formData.append('description', routeDescription);
      formData.append('location', routeLocation);
      formData.append('category', routeCategory);
      formData.append('thumbnail_1x1', routeThumbnail);
      formData.append('download_required', routeDownloadRequired ? 'true' : 'false');
      if (routeThumbFile) {
        formData.append('thumbnail_file', routeThumbFile);
      }

      let res;
      if (editingRoute) {
        res = await updateRoute(editingRoute.id, formData);
      } else {
        res = await createRoute(formData);
      }

      if (res.success) {
        alert('Ruta guardada!');
        if (!editingRoute) resetRouteForm();
        const updated = await getAdminLegends();
        setLegends(updated as any);
      } else {
        alert("Error: " + res.error);
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSavePoi(formData: FormData) {
    setIsLoading(true);
    try {
      let res;
      if (editingPoi) {
        // Editar un POI existent
        res = await updatePoi(editingPoi.id, formData);
      } else {
        // Crear un nou POI (amb route_id si managingRoute o editingLegend estan actius)
        // ❌ NO cridem updateLegend — això sobreescriuria el nom de la ruta
        res = await createPoi(formData);
      }

      if (res.success) {
        alert(editingPoi ? 'Punt actualitzat!' : 'Punt guardat correctament!');
        setEditingPoi(null);
        const updated = await getAdminLegends();
        setLegends(updated as any);
      } else {
        alert("Error: " + res.error);
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-8 font-sans">
      {/* CAPÇALERA INSTITUCIONAL */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-stone-200 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight">PXX Studio</h1>
          <p className="text-stone-500 font-serif italic">Panell de Control Institucional</p>
        </div>

        {/* NAVEGACIÓ SENSE IMAGE STORAGE */}
        <nav className="flex space-x-2 bg-stone-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('rutes')}
            className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === 'rutes' ? `bg-white ${adminTheme.mainText} shadow-sm ring-1 ring-stone-200` : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'}`}
          >
            Creació de Rutes
          </button>
          <button
            onClick={() => setActiveTab('usuaris')}
            className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === 'usuaris' ? `bg-white ${adminTheme.mainText} shadow-sm ring-1 ring-stone-200` : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'}`}
          >
            Gestió d'Usuaris
          </button>
          <button
            onClick={() => setActiveTab('executiu')}
            className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === 'executiu' ? `bg-white ${adminTheme.mainText} shadow-sm ring-1 ring-stone-200` : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'}`}
          >
            Informe Executiu
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === 'config' ? `bg-white ${adminTheme.mainText} shadow-sm ring-1 ring-stone-200` : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'}`}
          >
            Configuració
          </button>
        </nav>
      </header>

      {/* CONTINGUT DINÀMIC */}
      <main className="animate-in fade-in duration-500">
        {activeTab === 'rutes' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* COLUMNA ESQUERRA: MOTOR IA (NOMÉS VISTA) */}
              <Card className="border-stone-200 shadow-sm bg-white h-full">
                <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                  <CardTitle className="font-serif text-xl text-stone-800 flex items-center gap-2">
                    <span>🤖</span> 1. Analista Documental (IA)
                  </CardTitle>
                  <p className="text-sm text-stone-500">Puja documents per extraure informació de referència.</p>
                </CardHeader>
                <CardContent className="p-6">
                  <AiRouteGenerator theme={adminTheme} />
                </CardContent>
              </Card>

              {/* COLUMNA DRETA: GESTOR DE CARPETA (MANUAL) */}
              <Card className="border-stone-200 shadow-sm bg-white h-full overflow-hidden">
                <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                  <CardTitle className="font-serif text-xl text-stone-800 flex items-center gap-2">
                    <span>✍️</span> 2. Gestió de Carpeta i Punts
                  </CardTitle>
                  <p className="text-sm text-stone-500">Omple les dades manualment basant-te en la IA.</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 border-b border-stone-100 bg-stone-50/30">
                    <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4">Metadata de la Ruta (Carpeta)</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="routeTitle">Nom de la Ruta</Label>
                        <Input id="routeTitle" value={routeTitle} onChange={(e) => setRouteTitle(e.target.value)} placeholder="Ex: Ruta de l'Ecomuseu" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="routeLocation">Localització (Municipi/Poble)</Label>
                        <Input id="routeLocation" value={routeLocation} onChange={(e) => setRouteLocation(e.target.value)} placeholder="Ex: Sort" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="routeThumb" className="flex items-center justify-between text-stone-600">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Portada de Carpeta (1x1)
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">Upload Recomanat</span>
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRouteThumbFile(file);
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">O URL:</span>
                          <Input id="routeThumb" value={routeThumbnail} onChange={(e) => setRouteThumbnail(e.target.value)} placeholder="URL imatge" className="h-8 text-xs" />
                        </div>
                      </div>
                      {/* Eliminat: Pell / Estil Visual (ara és global) */}
                      <div className="flex items-center gap-2 py-2">
                        <input
                          type="checkbox"
                          id="routeDownloadRequired"
                          checked={routeDownloadRequired}
                          onChange={(e) => setRouteDownloadRequired(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-900"
                        />
                        <Label htmlFor="routeDownloadRequired" className="text-xs font-bold text-stone-600 mb-0 cursor-pointer">
                          ⚠️ Baixada Recomanada (Manca Cobertura)
                        </Label>
                      </div>
                      <Button onClick={handleSaveRoute} disabled={isLoading} size="sm" className={`w-fit ${adminTheme.primary} ${adminTheme.hover} text-white`}>
                        {editingRoute ? 'Actualitzar Ruta' : 'Crear Ruta'}
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
                      {editingPoi ? (
                        <span className="flex items-center gap-2">
                          ✏️ Editant: <span className={`${adminTheme.mainText} normal-case font-normal`}>{editingPoi.title}</span>
                        </span>
                      ) : 'Editor de Punts'}
                      {!editingPoi && managingRoute && (
                        <span className={`ml-2 text-[10px] font-normal ${adminTheme.mainText} normal-case`}>
                          → assignant a "{managingRoute.name}"
                        </span>
                      )}
                    </h3>
                    <ManualPoiForm
                      key={editingPoi?.id ?? (managingRoute?.id ?? 'new')}
                      poi={editingPoi ?? null}
                      onSave={handleSavePoi}
                      onCancel={resetRouteForm}
                      isLoading={isLoading}
                      routes={legends}
                      defaultRouteId={managingRoute?.id ?? (editingLegend?.id ?? undefined)}
                      municipalityTheme={municipalityTheme}
                    />

                    {editingLegend && (
                      <div className="pt-6 border-t border-stone-100">
                        <Label className="mb-4 block text-stone-800 font-bold">Consola de Vídeo HLS (Extra)</Label>
                        <VideoUploader poiId={editingLegend.id} theme={adminTheme} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROUTE POI MANAGER PANEL */}
            {managingRoute && (
              <RoutePoiManager
                routeId={managingRoute.id}
                routeName={managingRoute.name}
                onClose={() => setManagingRoute(null)}
                theme={adminTheme}
                onEditPoi={(poi) => {
                  setEditingPoi(poi);
                  setEditingLegend(null);
                }}
              />
            )}

            {/* LIST OF LEGENDS */}
            <Card className="border-stone-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-stone-800">Llistat de Llegendes Existents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-stone-200">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-700">
                      <tr className="text-left border-b border-stone-200">
                        <th className="p-4 font-medium font-serif">Títol</th>
                        <th className="p-4 font-medium font-serif text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legends?.map((legend: any) => (
                        <tr key={legend.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                          <td className="p-4 font-medium text-stone-800">{legend.title}</td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${adminTheme.mainText} ${adminTheme.hover} ${adminTheme.bg}`}
                              onClick={() => {
                                setEditingLegend(legend);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${managingRoute?.id === legend.id
                                ? `${adminTheme.text} ${adminTheme.bg}`
                                : `text-stone-500 hover:${adminTheme.mainText} hover:${adminTheme.bg}`
                                }`}
                              onClick={() => {
                                const next = managingRoute?.id === legend.id
                                  ? null
                                  : { id: legend.id, name: legend.title };
                                setManagingRoute(next);
                                if (next) window.scrollTo({ top: 0, behavior: 'smooth' });
                                else setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                              }}
                            >
                              {managingRoute?.id === legend.id ? '▲ Tancar Punts' : 'Punts →'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-stone-400 hover:text-red-600 hover:bg-red-50"
                              onClick={async () => {
                                if (confirm("Segur que vols esborrar?")) {
                                  await deleteLegend(legend.id);
                                  router.refresh();
                                }
                              }}
                            >
                              Esborrar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {activeTab === 'usuaris' && (
          <UsersTable profiles={profiles} theme={adminTheme} />
        )}

        {activeTab === 'executiu' && (
          <ExecutiveReport municipalityId={municipalityId || ''} theme={adminTheme} />
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <Card className="border-stone-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-stone-800">Paràmetres del Municipi/Territori</CardTitle>
                <p className="text-sm text-stone-500">Aquesta configuració afecta a com es mostren les localitzacions a l'app.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <MunicipalityManager municipalityId={municipalityId} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
