"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPostMedia, FileValidationError } from "@/lib/storage";
import { Bold, Italic, Underline, Link2, ImageIcon, UserCircle2, AlertCircle } from "lucide-react";

interface RichEmailEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichEmailEditor({ onChange, placeholder = "Écris ton message..." }: RichEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const handleBold = () => exec("bold");
  const handleItalic = () => exec("italic");
  const handleUnderline = () => exec("underline");

  const handleLink = () => {
    const url = window.prompt("Lien (URL complète) :");
    if (url) exec("createLink", url);
  };

  const handleInsertMergeTag = () => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, "{{prenom}}");
    emitChange();
  };

  const handlePickImage = () => imageInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      const { url } = await uploadPostMedia(user.id, "email-assets", file);
      exec("insertImage", url);
    } catch (err) {
      setError(err instanceof FileValidationError ? err.message : err instanceof Error ? err.message : "Échec de l'upload de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 p-1.5 bg-secondary/50 border border-border/60 rounded-t-xl flex-wrap">
        <button type="button" onClick={handleBold} className="p-1.5 rounded-lg hover:bg-card text-foreground" title="Gras">
          <Bold size={14} />
        </button>
        <button type="button" onClick={handleItalic} className="p-1.5 rounded-lg hover:bg-card text-foreground" title="Italique">
          <Italic size={14} />
        </button>
        <button type="button" onClick={handleUnderline} className="p-1.5 rounded-lg hover:bg-card text-foreground" title="Souligné">
          <Underline size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" onClick={handleLink} className="p-1.5 rounded-lg hover:bg-card text-foreground" title="Insérer un lien">
          <Link2 size={14} />
        </button>
        <button type="button" onClick={handlePickImage} disabled={isUploading} className="p-1.5 rounded-lg hover:bg-card text-foreground disabled:opacity-50" title="Insérer une image">
          <ImageIcon size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={handleInsertMergeTag}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-card text-foreground text-[11px] font-medium"
          title="Insère le prénom réel du destinataire à la lecture"
        >
          <UserCircle2 size={13} /> Prénom du destinataire
        </button>
        {isUploading && <span className="text-[11px] text-muted-foreground ml-auto">Envoi de l&apos;image...</span>}
      </div>

      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />

      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="min-h-40 max-h-96 overflow-y-auto p-3 rounded-b-xl border border-t-0 border-border/60 bg-background text-sm text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_a]:text-accent [&_a]:underline"
        suppressContentEditableWarning
      />

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Astuce : clique sur &laquo; Prénom du destinataire &raquo; pour que chaque personne voie son propre prénom à la lecture.
      </p>
    </div>
  );
}
