"use client";

import * as React from "react";
import { HugeiconsIcon as RawHugeiconsIcon } from "@hugeicons/react";

export interface HugeIconProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function HugeIcon({
  icon,
  size = 18,
  className,
  color = "currentColor",
  strokeWidth = 1.8
}: HugeIconProps) {
  return (
    <span className="inline-flex items-center justify-center shrink-0">
      <RawHugeiconsIcon
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
      />
    </span>
  );
}
