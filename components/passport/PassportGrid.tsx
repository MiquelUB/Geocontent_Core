'use client';

import { useState, useEffect } from "react";
import { PassportStamp } from "./PassportStamp";

interface PassportGridProps {
  initialStamps?: any[];
}

export function PassportGrid({ initialStamps = [] }: PassportGridProps) {
  const [stamps, setStamps] = useState<any[]>(initialStamps);

  useEffect(() => {
    // Refresh stamps list when parent re-loads data
    setStamps(initialStamps);
  }, [initialStamps]);

  const handleStampClick = (stamp: any) => {
    // Future: open a stamp detail modal or the route detail screen
    if (!stamp.isCompleted) {
      console.log('[Passport] Stamp clicked — incomplete route:', stamp.name);
    }
  };

  // Fill empty slots to always show at least 3 cells
  const minSlots = Math.max(stamps.length, 3);
  const emptyCount = minSlots - stamps.length;

  return (
    <div className="grid grid-cols-3 gap-3">
      {stamps.map((stamp, index) => (
        <PassportStamp
          key={stamp.id}
          id={stamp.id}
          name={stamp.name}
          date={stamp.date}
          stampUrl={stamp.stampUrl}
          totalPois={stamp.totalPois ?? 1}
          visitedPois={stamp.visitedPois ?? 0}
          quizDonePois={stamp.quizDonePois ?? 0}
          poisProgress={stamp.poisProgress ?? []}
          isCompleted={stamp.isCompleted ?? false}
          onClick={() => handleStampClick(stamp)}
          index={index}
        />
      ))}

      {/* Empty placeholder slots */}
      {Array.from({ length: emptyCount }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="aspect-square rounded-xl border-2 border-dashed border-primary/[0.07] bg-primary/[0.015]"
        />
      ))}
    </div>
  );
}
