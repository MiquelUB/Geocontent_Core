import { useState, useEffect, useCallback } from 'react'
import { geofencingService, Location, GeofenceEvent } from '@/lib/services/geofencing-service'
import { createClient } from '@/lib/database/supabase/client'
import { circle } from '@turf/turf'

interface UseGeofencingReturn {
  activeGeofences: Location[]
  loading: boolean
  error: string | null
  checkPosition: (latitude: number, longitude: number) => void
}

export function useGeofencing(
  latitude: number | null,
  longitude: number | null
): UseGeofencingReturn {
  const [activeGeofences, setActiveGeofences] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Cargar geocercas desde Supabase
  useEffect(() => {
    async function loadGeofences() {
      try {
        setLoading(true)
        
        const { data, error: fetchError } = await supabase
          .from('pois')
          .select('id, title, description, latitude, longitude, quiz_xp_reward, route_id')
          .not('route_id', 'is', null)

        if (fetchError) throw fetchError

        if (data) {
          // Convertir punts amb radi a format de geofencing (cercle de 50m)
          const locations: Location[] = data.map((loc: any) => {
            let zoneData = null;
            
            if (loc.latitude && loc.longitude) {
              // Generar un cercle de 50 metres (0.05 km) al voltant del punt
              const c = circle([loc.longitude, loc.latitude], 0.05, { units: 'kilometers' });
              zoneData = c.geometry;
            }

            return {
              id: loc.id,
              name: loc.title || 'Punt d\'interès',
              description: loc.description,
              zone: zoneData as any,
              active: true,
              points_value: loc.quiz_xp_reward || 100,
            }
          }).filter((l: any) => l.zone);

          geofencingService.loadGeofences(locations)
        }

        setError(null)
      } catch (err) {
        console.error('Error loading geofences:', err)
        setError('Error al cargar las geocercas')
      } finally {
        setLoading(false)
      }
    }

    loadGeofences()
  }, [supabase])

  // Verificar posición cuando cambia la ubicación
  const checkPosition = useCallback((lat: number, lon: number) => {
    const active = geofencingService.checkPosition(lat, lon)
    setActiveGeofences(active)
  }, [])

  // Auto-verificar cuando cambia la ubicación del usuario
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      checkPosition(latitude, longitude)
    }
  }, [latitude, longitude, checkPosition])

  // Configurar callbacks para eventos de entrada/salida
  useEffect(() => {
    const handleEnter = (event: GeofenceEvent) => {
      console.log('🎯 Entrada en geocerca:', event.location.name)
      // Aquí se puede mostrar notificación, reproducir contenido, etc.
    }

    const handleExit = (event: GeofenceEvent) => {
      console.log('👋 Salida de geocerca:', event.location.name)
    }

    geofencingService.onEnter(handleEnter)
    geofencingService.onExit(handleExit)

    return () => {
      geofencingService.reset()
    }
  }, [])

  return {
    activeGeofences,
    loading,
    error,
    checkPosition,
  }
}
