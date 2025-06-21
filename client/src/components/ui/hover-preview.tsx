"use client";

import * as React from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

interface HoverPreviewProps {
  children: React.ReactNode;
  imageUrl: string;
  title: string;
  description?: string;
  className?: string;
  previewWidth?: number;
  previewHeight?: number;
}

export function HoverPreview({
  children,
  imageUrl,
  title,
  description,
  className,
  previewWidth = 320,
  previewHeight = 240,
}: HoverPreviewProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <HoverCard.Root openDelay={200} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <div className={cn("cursor-pointer", className)}>
          {children}
        </div>
      </HoverCard.Trigger>
      
      <HoverCard.Portal>
        <HoverCard.Content
          className="z-50 max-w-sm rounded-lg border border-border bg-popover p-0 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          side="right"
          align="start"
          sideOffset={8}
        >
          <div className="overflow-hidden rounded-lg">
            {!imageError ? (
              <img
                src={imageUrl}
                alt={title}
                width={previewWidth}
                height={previewHeight}
                className="w-full h-auto object-cover"
                onError={() => setImageError(true)}
                style={{ 
                  width: previewWidth, 
                  height: previewHeight,
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center bg-muted text-muted-foreground text-sm"
                style={{ width: previewWidth, height: previewHeight }}
              >
                Image unavailable
              </div>
            )}
            
            <div className="p-4 space-y-2">
              <h4 className="font-semibold text-foreground">{title}</h4>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}