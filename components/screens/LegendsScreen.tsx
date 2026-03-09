import { useState, useEffect } from "react";
import { MapPin, Bookmark, Heart, SlidersHorizontal, BarChart, Mountain } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { motion } from "motion/react";
import { getLegends, getAppBranding } from "@/lib/actions";
import { PxxConfig } from "@/projects/active/config";

interface LegendsScreenProps {
    onNavigate: (screen: string, data?: any) => void;
    brand?: any;
}

// Difficulty derived deterministically from POI count (no Math.random)
function getDifficulty(poiCount: number): string {
    if (poiCount >= 8) return 'Expert';
    if (poiCount >= 4) return 'Mitjà';
    return 'Fàcil';
}

function hexToHsl(hex: string) {
    if (!hex || typeof hex !== 'string') return "0 0% 0%";

    let r = 0, g = 0, b = 0;
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;

    if (cleanHex.length === 4) {
        r = parseInt(cleanHex[1] + cleanHex[1], 16);
        g = parseInt(cleanHex[2] + cleanHex[2], 16);
        b = parseInt(cleanHex[3] + cleanHex[3], 16);
    } else if (cleanHex.length === 7) {
        r = parseInt(cleanHex.substring(1, 3), 16);
        g = parseInt(cleanHex.substring(3, 5), 16);
        b = parseInt(cleanHex.substring(5, 7), 16);
    } else {
        return "0 0% 0%";
    }

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}


export function LegendsScreen({ onNavigate, brand: propBrand }: LegendsScreenProps) {
    const [selectedRoute, setSelectedRoute] = useState("all");
    const [legends, setLegends] = useState<any[]>([]);
    const [brand, setBrand] = useState<any>(propBrand);

    // Filter Buttons (Routes)
    const [filterChips, setFilterChips] = useState<any[]>([{ id: "all", label: "Totes" }]);

    useEffect(() => {
        async function fetchData() {
            const [data, brandData] = await Promise.all([
                getLegends(),
                !propBrand ? getAppBranding() : Promise.resolve(propBrand)
            ]);
            if (!propBrand) setBrand(brandData);
            if (data) {
                const mapped = data.map((l: any) => ({
                    ...l,
                    location: l.location_name || '',
                    coordinates: { lat: l.latitude, lng: l.longitude },
                    image: l.image_url,
                    hero: l.hero_image_url,
                    difficulty: getDifficulty(l.poiCount ?? 0),
                    poiCount: l.poiCount ?? (l.pois?.length ?? 0),
                }));
                console.log("Mapped routes for library:", mapped[0]); // Debug coords
                setLegends(mapped);

                // Create chips for each individual route
                const routeChips = [
                    { id: "all", label: "Totes", category: "all" },
                    ...mapped.map((l: any) => ({
                        id: l.id,
                        label: l.title,
                        category: l.category
                    }))
                ];
                setFilterChips(routeChips);
            }
        }
        fetchData();
    }, []);

    const featuredLegend = legends[0];

    // Filter by selected route ID ("all" shows everything)
    const filteredLegends = selectedRoute === 'all'
        ? legends
        : legends.filter(l => l.id === selectedRoute);

    const activeChip = filterChips.find(c => c.id === selectedRoute);
    const activeLabel = activeChip?.label ?? 'Totes';

    // El bioma de la plana SEMPRE ha de ser el del municipi (brand), no el de la ruta filtrada
    const activeCategory = brand?.themeId || 'mountain';
    const theme = PxxConfig.chameleonThemes[activeCategory as keyof typeof PxxConfig.chameleonThemes] || PxxConfig.chameleonThemes['mountain'];

    // We explicitly cast to string, then React.CSSProperties
    const themeStyles = {
        '--primary': hexToHsl(theme.primary),
        '--accent': hexToHsl(theme.accent),
        '--background': hexToHsl(theme.bg),
    } as any;


    return (
        <div
            className="bg-background min-h-screen font-serif text-foreground flex flex-col transition-colors duration-500"
            style={themeStyles}
        >

            {/* Header */}
            <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm px-6 py-4 flex justify-between items-center border-b border-primary/10">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
                    {/* Logo Mark */}
                    {brand?.logoUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden shadow-md border border-white/20">
                            <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain bg-white p-2" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-white/20 text-white flex items-center justify-center rounded-full font-serif font-bold text-2xl tracking-tighter shadow-sm border border-white/20">
                            {brand?.name?.[0] || 'P'}
                        </div>
                    )}
                    <h1 className="font-serif text-xl font-bold tracking-tight text-primary-foreground">
                        {brand?.name || 'PXX Guide'}
                    </h1>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">

                {/* Filter Chips (Horizontal Scroll) */}
                <div className="flex gap-3 px-6 overflow-x-auto pb-6 pt-6 no-scrollbar">
                    {filterChips.map(chip => {
                        const isSelected = selectedRoute === chip.id;
                        const globalThemeId = brand?.themeId || 'mountain';

                        // Use global biome color for chips
                        const biomeColor = PxxConfig.chameleonThemes[globalThemeId as keyof typeof PxxConfig.chameleonThemes]?.primary || PxxConfig.chameleonThemes['mountain'].primary;

                        return (
                            <button
                                key={chip.id}
                                onClick={() => setSelectedRoute(chip.id)}
                                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-transform shadow-sm active:scale-95`}
                                style={{
                                    backgroundColor: isSelected ? biomeColor : 'transparent',
                                    color: isSelected ? 'white' : biomeColor,
                                    border: `2px solid ${biomeColor}`
                                }}
                            >
                                {chip.label}
                            </button>
                        );
                    })}
                </div>

                {/* Route List */}
                <div className="px-6 space-y-8">
                    {/* Section Header */}
                    <div className="flex items-center gap-4">
                        <h2 className="font-serif text-2xl text-foreground font-bold">
                            {selectedRoute === 'all' ? 'Biblioteca de Rutes' : activeLabel}
                        </h2>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                        <span className="text-sm text-gray-400">{filteredLegends.length} rutes</span>
                    </div>

                    {/* Empty state */}
                    {filteredLegends.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <Mountain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-serif text-lg">Cap ruta en aquesta categoria.</p>
                            <p className="text-sm mt-1">Crea-les des del panell d'administració.</p>
                        </div>
                    )}

                    {/* Route Cards */}
                    {filteredLegends.map((legend, index) => (
                        <div
                            key={legend.id}
                            onClick={() => onNavigate('legend-detail', legend)}
                            className="group relative bg-white dark:bg-zinc-900 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-zinc-800 cursor-pointer"
                        >
                            {/* Image Area */}
                            <div className="relative h-64 w-full overflow-hidden">
                                <ImageWithFallback
                                    src={legend.image}
                                    alt={legend.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

                                <div className="absolute bottom-0 left-0 w-full p-5">
                                    <h3 className="font-serif text-white text-2xl font-bold mb-3 tracking-wide drop-shadow-md">{legend.title}</h3>

                                    <div className="flex flex-wrap gap-2 text-xs font-bold tracking-wide text-white">
                                        {legend.location && (
                                            <div
                                                className="px-3 py-1 rounded shadow-sm"
                                                style={{
                                                    backgroundColor: PxxConfig.chameleonThemes[legend.category as keyof typeof PxxConfig.chameleonThemes]?.primary || 'hsl(var(--primary))'
                                                }}
                                            >
                                                <span>{legend.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Short Description */}
                            <div className="p-4 bg-white dark:bg-zinc-900">
                                <p className="text-gray-600 dark:text-gray-400 font-serif text-base leading-relaxed line-clamp-2">
                                    {legend.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
