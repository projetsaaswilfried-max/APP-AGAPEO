"use client";

import { File01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

export interface FileAttachmentProps {
  type: "DOCUMENT";
  title: string;
  subtitle?: string;
  fileSizeBytes?: number;
  url?: string;
  className?: string;
}

export function FileAttachment({ title, subtitle, fileSizeBytes, url, className }: FileAttachmentProps) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleDownloadDocument = () => {
    if (url && url !== "#") {
      const a = document.createElement("a");
      a.href = url;
      a.download = title || "document";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Téléchargement de "${title}"...`);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-border/40 max-w-sm select-none shadow-2xs",
        className
      )}
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-card border border-border/40 text-primary shrink-0 shadow-2xs">
        <HugeIcon icon={File01Icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        {fileSizeBytes && (
          <p className="text-[10px] text-muted-foreground font-mono">{formatSize(fileSizeBytes)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDownloadDocument}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-full transition-colors shrink-0"
        title="Télécharger le fichier"
      >
        <HugeIcon icon={Download01Icon} size={16} />
      </button>
    </div>
  );
}
