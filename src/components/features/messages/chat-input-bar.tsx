"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateImageFile, validateVideoFile, validateDocumentFile, FileValidationError } from "@/lib/storage";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { useVoiceRecorder } from "@/components/features/messages/use-voice-recorder";
import {
  SentIcon,
  Attachment01Icon,
  Image01Icon,
  File01Icon,
  Video01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  Mic01Icon,
  Delete02Icon,
  StopIcon,
  VoiceIcon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

export interface PendingFilePayload {
  file: File;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  previewUrl?: string;
}

export interface PendingVoicePayload {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendFileAttachment?: (payload: PendingFilePayload) => void;
  onSendVoiceMessage?: (payload: PendingVoicePayload) => void;
  onTyping?: () => void;
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChatInputBar({ onSendMessage, onSendFileAttachment, onSendVoiceMessage, onTyping }: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFilePayload | null>(null);
  const recorder = useVoiceRecorder();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAtRef = useRef(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentAtRef.current > 1500) {
      lastTypingSentAtRef.current = now;
      onTyping?.();
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (recorder.recordedBlob) {
      onSendVoiceMessage?.({ blob: recorder.recordedBlob, mimeType: recorder.recordedBlob.type, durationSeconds: recorder.recordedDurationSeconds });
      recorder.discardRecording();
      return;
    }

    if (pendingFile) {
      onSendFileAttachment?.(pendingFile);
      setPendingFile(null);
      setText("");
      return;
    }

    if (!text.trim()) return;

    onSendMessage(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setPendingFile({ file, type: "IMAGE", previewUrl: URL.createObjectURL(file) });
      setFileError(null);
    } catch (err) {
      setFileError(err instanceof FileValidationError ? err.message : "Fichier invalide.");
    }
    setShowAttachmentMenu(false);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateVideoFile(file);
      setPendingFile({ file, type: "VIDEO" });
      setFileError(null);
    } catch (err) {
      setFileError(err instanceof FileValidationError ? err.message : "Fichier invalide.");
    }
    setShowAttachmentMenu(false);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateDocumentFile(file);
      setPendingFile({ file, type: "DOCUMENT" });
      setFileError(null);
    } catch (err) {
      setFileError(err instanceof FileValidationError ? err.message : "Fichier invalide.");
    }
    setShowAttachmentMenu(false);
  };

  return (
    <div className="p-3 bg-card/90 backdrop-blur-md border-t border-border/40 relative select-none">
      <input type="file" ref={imageInputRef} onChange={handleImageFileChange} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />
      <input type="file" ref={videoInputRef} onChange={handleVideoFileChange} accept="video/mp4,video/webm,video/quicktime" className="hidden" />
      <input
        type="file"
        ref={docInputRef}
        onChange={handleDocFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden"
      />

      {fileError && (
        <div className="mb-2 p-2.5 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-between text-xs text-destructive">
          <div className="flex items-center gap-2">
            <HugeIcon icon={AlertCircleIcon} size={15} />
            <span>{fileError}</span>
          </div>
        </div>
      )}

      {recorder.errorMessage && (
        <div className="mb-2 p-2.5 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
          <HugeIcon icon={AlertCircleIcon} size={15} />
          <span>{recorder.errorMessage}</span>
        </div>
      )}

      {recorder.status === "recorded" && recorder.recordedBlob && (
        <div className="mb-3 p-3 bg-accent-subtle/80 border border-accent/25 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-card border border-border/40 text-primary shrink-0">
              <HugeIcon icon={VoiceIcon} size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground">Note vocale</span>
              <span className="text-[10px] text-muted-foreground font-mono">{formatRecordingTime(recorder.recordedDurationSeconds)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={recorder.discardRecording}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-card rounded-full transition-colors"
            title="Annuler"
          >
            <HugeIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="mb-3 p-3 bg-accent-subtle/80 border border-accent/25 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {pendingFile.type === "IMAGE" && pendingFile.previewUrl ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-black border border-border/40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingFile.previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-card border border-border/40 text-primary shrink-0">
                {pendingFile.type === "VIDEO" ? <HugeIcon icon={Video01Icon} size={20} /> : <HugeIcon icon={File01Icon} size={20} />}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">{pendingFile.file.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{(pendingFile.file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-card rounded-full transition-colors"
            title="Annuler"
          >
            <HugeIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
      )}

      {showAttachmentMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowAttachmentMenu(false)} />
          <div className="absolute bottom-16 left-4 right-4 sm:right-auto p-2 bg-card border border-border/40 rounded-3xl shadow-soft z-30 animate-in fade-in duration-150 sm:w-56 max-w-full">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-secondary rounded-full transition-colors text-foreground w-full font-medium"
              >
                <HugeIcon icon={Image01Icon} size={16} className="text-primary shrink-0" /> Photo
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-secondary rounded-full transition-colors text-foreground w-full font-medium"
              >
                <HugeIcon icon={Video01Icon} size={16} className="text-primary shrink-0" /> Vidéo
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-secondary rounded-full transition-colors text-foreground w-full font-medium"
              >
                <HugeIcon icon={File01Icon} size={16} className="text-accent shrink-0" /> Document
              </button>
            </div>
            <div className="flex items-start gap-1.5 px-3 pt-2 mt-1 border-t border-border/40 text-[11px] text-muted-foreground">
              <HugeIcon icon={InformationCircleIcon} size={12} className="shrink-0 mt-0.5" />
              <span>Taille max : Photo 15 Mo, Vidéo 100 Mo, Document 25 Mo</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {recorder.status === "recording" ? (
          <>
            <button
              type="button"
              onClick={recorder.cancelRecording}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-destructive bg-secondary/70 hover:bg-destructive/10 rounded-full transition-colors shrink-0"
              title="Annuler l'enregistrement"
            >
              <HugeIcon icon={Delete02Icon} size={17} />
            </button>

            <div
              className={cn(
                "flex-1 border rounded-full px-4 py-2 flex items-center gap-2.5 transition-colors",
                recorder.elapsedSeconds >= 2 && !recorder.hasDetectedSound
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-secondary/60 border-border/40"
              )}
            >
              <span
                className="w-2 h-2 rounded-full bg-destructive shrink-0 transition-transform duration-75"
                style={{ transform: `scale(${1 + recorder.audioLevel * 1.8})` }}
              />
              <span className="text-xs font-mono tabular-nums text-foreground shrink-0">{formatRecordingTime(recorder.elapsedSeconds)}</span>
              {recorder.elapsedSeconds >= 2 && !recorder.hasDetectedSound ? (
                <span className="text-[11px] text-destructive font-medium truncate">Aucun son détecté — vérifie ton micro</span>
              ) : (
                <div className="flex-1 flex items-end gap-[3px] h-5 min-w-0 overflow-hidden">
                  {recorder.levelHistory.map((level, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-destructive shrink-0"
                      style={{ height: `${4 + Math.min(1, level) * 16}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={recorder.stopRecording}
              size="icon"
              variant="primary"
              className="h-10 w-10 rounded-full shrink-0 shadow-accent-glow"
              title="Arrêter l'enregistrement"
            >
              <HugeIcon icon={StopIcon} size={15} />
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary bg-secondary/70 hover:bg-accent-subtle rounded-full transition-colors shrink-0"
              title="Joindre un fichier"
            >
              <HugeIcon icon={Attachment01Icon} size={18} />
            </button>

            <div className="flex-1 bg-secondary/60 border border-border/40 rounded-full px-4 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:bg-card transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={pendingFile ? `Appuyez sur Envoyer pour joindre ${pendingFile.file.name}` : "Écrivez votre message..."}
                className="flex-1 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-28"
              />
              <EmojiPicker onSelect={(emoji) => setText((prev) => prev + emoji)} />
            </div>

            {onSendVoiceMessage && !text.trim() && !pendingFile && !recorder.recordedBlob && (
              <button
                type="button"
                onClick={recorder.startRecording}
                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary bg-secondary/70 hover:bg-accent-subtle rounded-full transition-colors shrink-0"
                title="Enregistrer une note vocale"
              >
                <HugeIcon icon={Mic01Icon} size={18} />
              </button>
            )}

            <Button
              type="submit"
              size="icon"
              variant="primary"
              className="h-10 w-10 rounded-full shrink-0 shadow-accent-glow disabled:opacity-40"
              title="Envoyer"
              disabled={!text.trim() && !pendingFile && !recorder.recordedBlob}
            >
              <HugeIcon icon={SentIcon} size={16} />
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
