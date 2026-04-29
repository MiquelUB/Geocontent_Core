import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search, Filter, MapPin, Star, Calendar, ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { motion } from "motion/react";
import { getLegends } from "@/lib/actions/content";

interface PallarsLegendsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export function PallarsLegendsScreen({ onNavigate }: PallarsLegendsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("totes");

  const categories = [
    { id: "totes", label: "Totes" },
    { id: "criatures", label: "Criatures" },
    { id: "fantasmes", label: "Fantasmes" },
    { id: "tresors", label: "Tresors" },
    { id: "màgia", label: "Màgia" }
  ];

  const [legends, setLegends] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
        const data = await getLegends();
        if (data) {
             const mapped = data.map((l: any) => ({
                id: l.id,
                title: l.title,
                description: l.description,
                location: l.location_name || "Pallars",
                category: l.category,
                categoryLabel: l.category, // Simplification
                date: "Tradició", // Placeholder as DB doesn't have date yet
                rating: 4.5, // Placeholder
                image: l.image_url,
                hero: l.hero_image_url,
                audio: l.audio_url,
                video: l.video_url,
                featured: false
            }));
            setLegends(mapped);
        }
    }
    fetchData();
  }, []);

  const filteredLegends = legends.filter(legend => {
    const matchesSearch = legend.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         legend.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "totes" || 
                           legend.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="screen bg-background">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-pallars-green p-4 pb-2"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('home')}
            className="text-pallars-cream hover:bg-pallars-cream/10 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pallars-cream rounded-full flex items-center justify-center">
              <span className="text-sm font-serif font-bold text-pallars-green">M</span>
            </div>
            <h1 className="text-xl font-serif font-bold text-pallars-cream">
              Llegendes del Pallars
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pallars-green w-4 h-4" />
          <Input
            placeholder="Busca llegendes, llocs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-pallars-cream border-0 text-pallars-green placeholder:text-pallars-green/60"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={`whitespace-nowrap flex-shrink-0 ${
                selectedCategory === category.id 
                  ? "bg-pallars-cream text-pallars-green" 
                  : "border-pallars-cream text-black hover:bg-pallars-cream/10"
              }`}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Results count */}
      <div className="px-4 py-2 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {filteredLegends.length} {filteredLegends.length === 1 ? 'llegenda trobada' : 'llegendes trobades'}
          {selectedCategory !== "totes" && ` · Categoria: ${categories.find(c => c.id === selectedCategory)?.label}`}
        </p>
      </div>

      {/* Legends list */}
      <div className="p-4 space-y-4">
        {filteredLegends.map((legend, index) => (
          <motion.div
            key={legend.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate('legend-detail', legend)}
            className="pallars-card cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 relative">
                <ImageWithFallback
                  src={legend.image}
                  alt={legend.title}
                  className="w-full h-full object-cover"
                />
                {legend.featured && (
                  <Badge className="absolute top-1 left-1 text-xs bg-yellow-500 text-yellow-900 border-0">
                    ★
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-serif font-medium text-pallars-green line-clamp-2 pr-2">
                    {legend.title}
                  </h3>
                  <div className="flex items-center gap-1 ml-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{legend.rating}</span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {legend.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{legend.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{legend.date}</span>
                    </div>
                  </div>
                  
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-pallars-brown/10 text-pallars-brown border-0"
                  >
                    {legend.categoryLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredLegends.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 px-6"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif font-medium text-pallars-green mb-2">
            Cap llegenda trobada
          </h3>
          <p className="text-muted-foreground text-center">
            Prova amb una altra cerca o canvia els filtres
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("totes");
            }}
          >
            Neteja filtres
          </Button>
        </motion.div>
      )}
    </div>
  );
}
