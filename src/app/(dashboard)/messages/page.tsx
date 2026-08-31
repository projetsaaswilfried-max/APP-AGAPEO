"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationSummary, ChatMessage } from "@/domain/types/message";
import { messageService } from "@/domain/services/message.service";
import { useSession } from "@/core/providers/session-provider";
import { ConversationListItem } from "@/components/features/messages/conversation-list-item";
import { MessageBubble } from "@/components/features/messages/message-bubble";
import { ChatInputBar, PendingFilePayload, PendingVoicePayload } from "@/components/features/messages/chat-input-bar";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, AlertCircle, MoreVertical, Flag, Ban, Bookmark, Trash2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { BlockConfirmModal } from "@/components/features/moderation/block-confirm-modal";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { PremiumRequiredError } from "@/domain/errors";
import { isProfileComplete } from "@/domain/profile-completeness";
import { requestMatchAction, respondToMatchAction, cancelMatchAction, getMatchForConversationAction } from "@/lib/actions/match.actions";
import type { MatchRow } from "@/lib/supabase/database.types";

/** Fait remonter une conversation en tête de liste tout en lui appliquant des mises à jour (dernier message, compteur non lu...) — jamais un simple `.map()` qui laisserait sa position inchangée. */
function moveConversationToTop(
  conversations: ConversationSummary[],
  conversationId: string,
  updates: Partial<ConversationSummary>
): ConversationSummary[] {
  const idx = conversations.findIndex((c) => c.id === conversationId);
  if (idx === -1) return conversations;
  const updated = { ...conversations[idx], ...updates };
  const rest = conversations.filter((_, i) => i !== idx);
  return [updated, ...rest];
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useSession();
  const canSendMessages = profile.subscription_status === "ACTIVE" || profile.role !== "USER";
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(Boolean(searchParams.get("conversation")));
  const [sendError, setSendError] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isDeleteConvOpen, setIsDeleteConvOpen] = useState(false);
  const [isDeletingConv, setIsDeletingConv] = useState(false);
  const [isPremiumRequiredOpen, setIsPremiumRequiredOpen] = useState(false);
  const [isInviteBusy, setIsInviteBusy] = useState(false);
  const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
  const [isMatchBusy, setIsMatchBusy] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isMatchRequestConfirmOpen, setIsMatchRequestConfirmOpen] = useState(false);
  const [isMatchAcceptConfirmOpen, setIsMatchAcceptConfirmOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    setIsLoadingConvs(true);
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      if (!activeConvId && data.length > 0) setActiveConvId(data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConvs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await messageService.getMessages(convId);
      setMessages(data);
      await messageService.markAsRead(convId);
      // Le marquage côté serveur ci-dessus ne met pas à jour, à lui seul, le
      // badge affiché dans la liste de gauche — sans ça, le chiffre restait
      // affiché tant que la page n'était pas rechargée.
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!activeConvId) return;

    const unsubscribeMessages = messageService.subscribeToConversation(activeConvId, (message) => {
      if (message.senderId === user.id) return;
      setMessages((prev) => [...prev, message]);
      void messageService.markAsRead(activeConvId);
      setOtherIsTyping(false);
    });

    const unsubscribeTyping = messageService.subscribeToTyping(activeConvId, (userId) => {
      if (userId === user.id) return;
      setOtherIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
    });

    const unsubscribeUpdates = messageService.subscribeToMessageUpdates(activeConvId, (update) => {
      setMessages((prev) => {
        if (update.deletedAt) return prev.filter((m) => m.id !== update.id);
        return prev.map((m) => (m.id === update.id ? { ...m, ...update } : m));
      });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      unsubscribeUpdates();
      setOtherIsTyping(false);
    };
  }, [activeConvId, user.id]);

  // Toutes conversations confondues (pas seulement celle ouverte) : sans ça,
  // recevoir un message dans une AUTRE discussion ne la faisait ni remonter
  // en tête de liste, ni apparaître avec son compteur non lu à jour, tant
  // que la page n'était pas rechargée.
  useEffect(() => {
    const unsubscribe = messageService.subscribeToAllConversations((message) => {
      if (message.senderId === user.id) return;
      setConversations((prev) => {
        const isActive = message.conversationId === activeConvId;
        const current = prev.find((c) => c.id === message.conversationId);
        if (!current) return prev;
        return moveConversationToTop(prev, message.conversationId, {
          lastMessage: message,
          updatedAt: new Date().toISOString(),
          unreadCount: isActive ? current.unreadCount : current.unreadCount + 1
        });
      });
    });
    return unsubscribe;
  }, [user.id, activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = conversations.filter((c) =>
    searchQuery ? `${c.participant.firstName} ${c.participant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  useEffect(() => {
    if (!activeConvId || activeConv?.status !== "ACCEPTED") {
      setActiveMatch(null);
      return;
    }
    let cancelled = false;
    getMatchForConversationAction(activeConvId).then((match) => {
      if (!cancelled) setActiveMatch(match);
    });
    return () => {
      cancelled = true;
    };
  }, [activeConvId, activeConv?.status]);

  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    setIsMobileChatOpen(true);
    router.replace(`/messages?conversation=${convId}`, { scroll: false });
  };

  const handleBackToList = () => {
    setIsMobileChatOpen(false);
    router.replace("/messages", { scroll: false });
  };

  const handleTyping = useCallback(() => {
    if (activeConvId) void messageService.broadcastTyping(activeConvId);
  }, [activeConvId]);

  const handleAcceptInvitation = async () => {
    if (!activeConvId) return;
    setIsInviteBusy(true);
    try {
      await messageService.acceptInvitation(activeConvId);
      setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, status: "ACCEPTED" } : c)));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Impossible d'accepter cette invitation.");
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setIsInviteBusy(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!activeConvId) return;
    setIsInviteBusy(true);
    try {
      await messageService.declineInvitation(activeConvId);
      setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
      setActiveConvId(null);
      router.replace("/messages", { scroll: false });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Impossible de refuser cette invitation.");
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setIsInviteBusy(false);
    }
  };

  const handleRequestMatch = async () => {
    if (!activeConvId) return;
    setIsMatchRequestConfirmOpen(false);
    setIsMatchBusy(true);
    setMatchError(null);
    const result = await requestMatchAction(activeConvId);
    if ("error" in result) {
      setMatchError(result.error);
      setTimeout(() => setMatchError(null), 4000);
    } else {
      setActiveMatch(await getMatchForConversationAction(activeConvId));
    }
    setIsMatchBusy(false);
  };

  const handleRespondToMatch = async (accept: boolean) => {
    if (!activeMatch || !activeConvId) return;
    setIsMatchAcceptConfirmOpen(false);
    setIsMatchBusy(true);
    const result = await respondToMatchAction(activeMatch.id, accept);
    if ("error" in result) {
      setMatchError(result.error);
      setTimeout(() => setMatchError(null), 4000);
    } else {
      setActiveMatch(await getMatchForConversationAction(activeConvId));
    }
    setIsMatchBusy(false);
  };

  const handleCancelMatch = async () => {
    if (!activeMatch) return;
    setIsMatchBusy(true);
    const result = await cancelMatchAction(activeMatch.id);
    if ("error" in result) {
      setMatchError(result.error);
      setTimeout(() => setMatchError(null), 4000);
    } else {
      setActiveMatch(null);
    }
    setIsMatchBusy(false);
  };

  const runSend = async (action: () => Promise<ChatMessage>) => {
    if (!activeConvId) return;
    setSendError(null);
    try {
      const newMsg = await action();
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) => moveConversationToTop(prev, activeConvId, { lastMessage: newMsg, updatedAt: new Date().toISOString() }));
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        setIsPremiumRequiredOpen(true);
        return;
      }
      setSendError(err instanceof Error ? err.message : "L'envoi a échoué.");
      setTimeout(() => setSendError(null), 4000);
    }
  };

  const handleSendMessage = (text: string) => runSend(() => messageService.sendMessage(activeConvId!, text));
  const handleSendFileAttachment = (payload: PendingFilePayload) => runSend(() => messageService.sendFileAttachment(activeConvId!, payload.file, payload.type));
  const handleSendVoiceMessage = (payload: PendingVoicePayload) =>
    runSend(() => messageService.sendVoiceMessage(activeConvId!, payload.blob, payload.mimeType, payload.durationSeconds));

  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await messageService.deleteMessage(msgId);
  };

  const handleToggleFavoriteConversation = async () => {
    if (!activeConvId || !activeConv) return;
    const nextValue = !activeConv.isFavorite;
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, isFavorite: nextValue } : c)));
    await messageService.toggleFavoriteConversation(activeConvId, nextValue);
    setIsHeaderMenuOpen(false);
  };

  const handleBlocked = () => {
    setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
    setActiveConvId(null);
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId) return;
    setIsDeletingConv(true);
    await messageService.hideConversation(activeConvId);
    setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
    setActiveConvId(null);
    setIsDeletingConv(false);
    setIsDeleteConvOpen(false);
  };

  return (
    <div className={cn("space-y-4 w-full select-none", isMobileChatOpen ? "pb-0" : "pb-16")}>
      <div className={cn("border-b border-border/40 pb-3", isMobileChatOpen && "hidden md:block")}>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Messagerie Privée & Échanges</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Discutez en toute sérénité avec vos contacts.</p>
      </div>

      {/*
        Une fois une conversation ouverte sur mobile, la barre de nav du bas
        et le padding qui lui était réservé disparaissent (bottom-nav.tsx,
        app-shell.tsx) — on récupère ici cet espace en réduisant d'autant la
        hauteur soustraite (13rem -> 6rem, header d'app 4rem + marges), pour
        que la discussion occupe vraiment tout l'écran disponible, comme
        WhatsApp. Desktop conserve la mise en page à deux colonnes d'origine.
      */}
      <div
        className={cn(
          "min-h-[520px] bg-card border border-border/40 rounded-3xl overflow-hidden shadow-soft flex",
          isMobileChatOpen ? "h-[calc(100dvh-6rem)] md:h-[calc(100dvh-13rem)]" : "h-[calc(100dvh-13rem)]"
        )}
      >
        <div
          className={cn(
            "w-full md:w-80 border-r border-border/40 flex flex-col bg-card shrink-0 transition-all duration-200",
            isMobileChatOpen ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-4 border-b border-border/40 space-y-3">
            <h2 className="text-sm font-display font-semibold text-foreground tracking-tight">Discussions ({conversations.length})</h2>
            <SearchInput
              placeholder="Rechercher une discussion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              className="text-xs h-9 bg-secondary/60 rounded-full"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingConvs && (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingConvs && filteredConversations.length === 0 && (
              <EmptyState
                icon={<MessageSquare size={20} />}
                title="Aucune conversation"
                description="Envoie un message depuis un profil dans Découvrir pour démarrer une discussion."
              />
            )}

            {!isLoadingConvs &&
              filteredConversations.map((conv) => (
                <ConversationListItem key={conv.id} conversation={conv} isActive={conv.id === activeConvId} onSelect={() => handleSelectConversation(conv.id)} />
              ))}
          </div>
        </div>

        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 bg-background transition-all duration-200",
            !isMobileChatOpen ? "hidden md:flex" : "flex"
          )}
        >
          {activeConv ? (
            <>
              <div className="relative z-20 flex items-center justify-between px-5 h-16 bg-card/90 backdrop-blur-md border-b border-border/40 shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={handleBackToList} className="p-2 text-muted-foreground hover:text-foreground md:hidden rounded-full hover:bg-secondary">
                    <ArrowLeft size={18} />
                  </button>

                  <Avatar
                    size="md"
                    src={activeConv.participant.avatarUrl}
                    fallback={activeConv.participant.firstName.charAt(0)}
                    isVerified={activeConv.participant.badges.some((b) => b.code === "VERIFIED_FAITH")}
                    isOnline={activeConv.isOnline}
                  />

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground tracking-tight">
                        {activeConv.participant.firstName} {activeConv.participant.lastName}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {otherIsTyping ? "est en train d'écrire..." : activeConv.isOnline ? "En ligne" : activeConv.lastSeen ? `Vu le ${activeConv.lastSeen}` : "Hors ligne"}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {isHeaderMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-56 p-1.5 bg-card border border-border/40 rounded-2xl shadow-soft z-50 text-xs">
                        <button
                          onClick={handleToggleFavoriteConversation}
                          className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary rounded-lg"
                        >
                          <Bookmark size={14} className={cn(activeConv.isFavorite && "fill-current text-accent")} />
                          {activeConv.isFavorite ? "Retirer des favoris" : "Marquer comme important"}
                        </button>
                        <button
                          onClick={() => {
                            setIsReportOpen(true);
                            setIsHeaderMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary rounded-lg"
                        >
                          <Flag size={14} /> Signaler cette personne
                        </button>
                        <button
                          onClick={() => {
                            setIsDeleteConvOpen(true);
                            setIsHeaderMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary rounded-lg"
                        >
                          <Trash2 size={14} /> Supprimer la discussion
                        </button>
                        <button
                          onClick={() => {
                            setIsBlockOpen(true);
                            setIsHeaderMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Ban size={14} /> Bloquer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {activeConv.status === "PENDING" ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-accent-subtle flex items-center justify-center">
                      <MessageSquare size={22} className="text-accent" />
                    </div>
                    {activeConv.initiatedByMe ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">Invitation envoyée à {activeConv.participant.firstName}</p>
                        <p className="text-xs text-muted-foreground">
                          Vous pourrez échanger dès que {activeConv.participant.firstName} aura accepté ton invitation à discuter.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">{activeConv.participant.firstName} souhaite discuter avec toi</p>
                        <p className="text-xs text-muted-foreground">
                          Accepte l&apos;invitation pour commencer à échanger des messages en toute confidentialité.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={handleDeclineInvitation} isLoading={isInviteBusy}>
                            Refuser
                          </Button>
                          <Button size="sm" onClick={handleAcceptInvitation} isLoading={isInviteBusy}>
                            Accepter l&apos;invitation
                          </Button>
                        </div>
                      </>
                    )}
                    {sendError && <p className="text-xs text-destructive">{sendError}</p>}
                  </div>
                </div>
              ) : (
                <>
                  {matchError && (
                    <div className="mx-4 mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                      <AlertCircle size={14} className="shrink-0" />
                      {matchError}
                    </div>
                  )}

                  {activeMatch?.status === "ACCEPTED" ? (
                    <div className="mx-4 mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-accent-subtle/60 border border-accent/20 text-xs text-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Heart size={14} className="fill-current text-accent shrink-0" /> Vous êtes en couple sur Agapeo !
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelMatch}
                        disabled={isMatchBusy}
                        className="shrink-0 text-xs font-semibold text-destructive hover:underline"
                      >
                        Annuler le match
                      </button>
                    </div>
                  ) : activeMatch?.status === "PENDING" && activeMatch.recipient_id === user.id ? (
                    <div className="mx-4 mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-accent-subtle/60 border border-accent/20 text-xs text-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Heart size={14} className="text-accent shrink-0" /> {activeConv.participant.firstName} te propose un match !
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button type="button" onClick={() => handleRespondToMatch(false)} disabled={isMatchBusy} className="text-xs font-semibold text-muted-foreground hover:underline">
                          Refuser
                        </button>
                        <button type="button" onClick={() => setIsMatchAcceptConfirmOpen(true)} disabled={isMatchBusy} className="text-xs font-semibold text-primary hover:underline">
                          Accepter
                        </button>
                      </div>
                    </div>
                  ) : activeMatch?.status === "PENDING" ? (
                    <div className="mx-4 mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/60 border border-border/40 text-xs text-muted-foreground">
                      <span>En attente de la réponse de {activeConv.participant.firstName}...</span>
                      <button type="button" onClick={handleCancelMatch} disabled={isMatchBusy} className="shrink-0 text-xs font-semibold text-destructive hover:underline">
                        Annuler
                      </button>
                    </div>
                  ) : !profile.is_matched ? (
                    <div className="mx-4 mt-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/40 border border-border/40 text-xs text-foreground">
                      <span>Vous vous sentez prêts à passer à l&apos;étape suivante ?</span>
                      <button
                        type="button"
                        onClick={() => setIsMatchRequestConfirmOpen(true)}
                        disabled={isMatchBusy}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 rounded-full px-3 py-1.5"
                      >
                        <Heart size={12} /> Matcher
                      </button>
                    </div>
                  ) : null}

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {isLoadingMessages ? (
                      <div className="space-y-3 p-4">
                        <Skeleton className="h-10 w-2/3 rounded-2xl" />
                        <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
                        <Skeleton className="h-10 w-3/4 rounded-2xl" />
                      </div>
                    ) : messages.length === 0 ? (
                      <EmptyState icon={<MessageSquare size={24} />} title="Aucun message" description="Envoie le premier message de cette conversation." />
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isCurrentUser={msg.senderId === user.id}
                            onDeleteMessage={handleDeleteMessage}
                            senderAvatarUrl={msg.senderId === user.id ? profile.avatar_url ?? undefined : activeConv.participant.avatarUrl}
                            senderAvatarFallback={msg.senderId === user.id ? profile.first_name?.charAt(0) : activeConv.participant.firstName.charAt(0)}
                          />
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {sendError && (
                    <div className="mx-4 mb-2 flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                      <AlertCircle size={14} className="shrink-0" />
                      {sendError}
                    </div>
                  )}

                  {!canSendMessages && (
                    <div className="mx-4 mb-2 flex items-center justify-between gap-3 p-3 rounded-2xl bg-accent-subtle/60 border border-accent/20 text-xs text-foreground">
                      <span>Passe Premium pour répondre à tes messages.</span>
                      <button
                        type="button"
                        onClick={() => setIsPremiumRequiredOpen(true)}
                        className="shrink-0 text-xs font-semibold text-primary hover:underline"
                      >
                        Découvrir
                      </button>
                    </div>
                  )}

                  <ChatInputBar
                    onSendMessage={handleSendMessage}
                    onSendFileAttachment={handleSendFileAttachment}
                    onSendVoiceMessage={handleSendVoiceMessage}
                    onTyping={handleTyping}
                  />
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {!isLoadingConvs && conversations.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare size={28} />}
                  title="Pas encore de messages"
                  description={
                    isProfileComplete(profile)
                      ? "Explore Découvrir et lance la conversation avec un profil qui t'intéresse."
                      : "Complète ton profil pour être visible dans Découvrir et commencer à recevoir des messages."
                  }
                  action={
                    <Link
                      href={isProfileComplete(profile) ? "/discover" : "/onboarding"}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2 shadow-accent-glow"
                    >
                      {isProfileComplete(profile) ? "Aller à Découvrir" : "Compléter mon profil"}
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={<MessageSquare size={28} />}
                  title={isLoadingConvs ? "Chargement..." : "Sélectionne une discussion"}
                  description="Choisis un interlocuteur dans la liste de gauche pour échanger."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {activeConv && (
        <>
          <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="PROFILE" targetId={activeConv.participant.id} />
          <BlockConfirmModal
            isOpen={isBlockOpen}
            onClose={() => setIsBlockOpen(false)}
            blockedProfileId={activeConv.participant.id}
            blockedProfileName={activeConv.participant.firstName}
            onBlocked={handleBlocked}
          />
          <Modal
            isOpen={isDeleteConvOpen}
            onClose={() => setIsDeleteConvOpen(false)}
            title="Supprimer cette discussion ?"
            description="Elle disparaît de ta liste. Si un nouveau message est échangé, elle réapparaît automatiquement."
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsDeleteConvOpen(false)} disabled={isDeletingConv}>
                  Annuler
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteConversation} isLoading={isDeletingConv}>
                  Supprimer
                </Button>
              </>
            }
          >
            <></>
          </Modal>

          <Modal
            isOpen={isMatchRequestConfirmOpen}
            onClose={() => setIsMatchRequestConfirmOpen(false)}
            title={`Proposer un match à ${activeConv.participant.firstName}`}
            maxWidth="sm"
          >
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Heart size={24} />
              </div>
              <p className="text-sm text-foreground">
                En proposant un match, tu indiques vouloir démarrer une relation sérieuse avec {activeConv.participant.firstName}.{" "}
                {activeConv.participant.firstName} devra accepter à son tour. Une fois confirmé : vos deux profils disparaissent de Découvrir, vous
                recevez chacun un email avec des conseils et une prière pour la suite, et vous ne pourrez plus proposer de match à quelqu&apos;un
                d&apos;autre tant que celui-ci est actif — tu pourras toujours l&apos;annuler plus tard.
              </p>
              <div className="flex items-center gap-2.5 w-full pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsMatchRequestConfirmOpen(false)} disabled={isMatchBusy}>
                  Annuler
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleRequestMatch} isLoading={isMatchBusy} leftIcon={<Heart size={15} />}>
                  Proposer le match
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={isMatchAcceptConfirmOpen}
            onClose={() => setIsMatchAcceptConfirmOpen(false)}
            title={`Accepter le match de ${activeConv.participant.firstName}`}
            maxWidth="sm"
          >
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Heart size={24} />
              </div>
              <p className="text-sm text-foreground">
                En acceptant, {activeConv.participant.firstName} et toi serez officiellement en couple sur Agapeo : vos deux profils disparaissent
                de Découvrir, vous recevez chacun un email avec des conseils pour la suite de votre relation, et vous ne pourrez plus matcher avec
                quelqu&apos;un d&apos;autre tant que ce match est actif. Tu pourras toujours l&apos;annuler plus tard si besoin.
              </p>
              <div className="flex items-center gap-2.5 w-full pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsMatchAcceptConfirmOpen(false)} disabled={isMatchBusy}>
                  Pas encore
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleRespondToMatch(true)}
                  isLoading={isMatchBusy}
                  leftIcon={<Heart size={15} />}
                >
                  Confirmer le match
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
      <PremiumRequiredModal
        isOpen={isPremiumRequiredOpen}
        onClose={() => setIsPremiumRequiredOpen(false)}
        reason="répondre à ce message"
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-13rem)] min-h-[520px] bg-card border border-border/60 rounded-3xl animate-pulse" />}>
      <MessagesPageContent />
    </Suspense>
  );
}
