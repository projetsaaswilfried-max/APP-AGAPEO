"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UserPhoto } from "@/domain/types/user";

export interface MediaGalleryProps {
  photos: UserPhoto[];
  onPhotoClick?: (photo: UserPhoto) => void;
  className?: string;
}

export function MediaGallery({
  photos,
  onPhotoClick,
  className
}: MediaGalleryProps) {
  if (!photos || photos.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 gap-3 w-full select-none",
        className
      )}
    >
      {photos.map((photo) => (
        <div
          key={photo.id}
          onClick={() => onPhotoClick?.(photo)}
          className="group relative aspect-4/5 rounded-2xl overflow-hidden bg-secondary border border-border/60 shadow-2xs cursor-pointer"
        >
          <img
            src={photo.url}
            alt={photo.caption || "Photo"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {photo.caption && (
            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent text-white text-xs font-medium truncate">
              {photo.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
