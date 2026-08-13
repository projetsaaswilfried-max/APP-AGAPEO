"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationSummary, ChatMessage } from "@/domain/types/message";
import { messageService } from "@/domain/services/message.service";
import { useSession } from "@/core/providers/session-provider";
import { ConversationListItem } from "@/components/features/messages/conversation-list-item";
import { MessageBubble } from "@/components/features/messages/message-bubble";
import { ChatInputBar, PendingFilePayload } from "@/components/features/messages/chat-input-bar";
import { SearchInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, MessageSquare, AlertCircle, MoreVertical, Flag, Ban, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { BlockConfirmModal } from "@/components/features/moderation/block-confirm-modal";

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSession();
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

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = conversations.filter((c) =>
    searchQuery ? `${c.participant.firstName} ${c.participant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

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

  const runSend = async (action: () => Promise<ChatMessage>) => {
    if (!activeConvId) return;
    setSendError(null);
    try {
      const newMsg = await action();
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt } : c)));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "L'envoi a échoué.");
      setTimeout(() => setSendError(null), 4000);
    }
  };

  const handleSendMessage = (text: string) => runSend(() => messageService.sendMessage(activeConvId!, text));
  const handleSendFileAttachment = (payload: PendingFilePayload) => runSend(() => messageService.sendFileAttachment(activeConvId!, payload.file, payload.type));

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

  return (
    <div className="space-y-4 w-full pb-16 select-none">
      <div className={cn("border-b border-border/40 pb-3", isMobileChatOpen && "hidden md:block")}>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Messagerie Privée & Échanges</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Discutez en toute sérénité avec vos contacts.</p>
      </div>

      <div className="h-[calc(100dvh-13rem)] min-h-[520px] bg-card border border-border/40 rounded-3xl overflow-hidden shadow-soft flex">
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
              <div className="flex items-center justify-between px-5 h-16 bg-card/90 backdrop-blur-md border-b border-border/40 shrink-0">
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
                      <div className="fixed inset-0 z-30" onClick={() => setIsHeaderMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-56 p-1.5 bg-card border border-border/40 rounded-2xl shadow-soft z-40 text-xs">
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
                      <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.senderId === user.id} onDeleteMessage={handleDeleteMessage} />
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

              <ChatInputBar
                onSendMessage={handleSendMessage}
                onSendFileAttachment={handleSendFileAttachment}
                onTyping={handleTyping}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageSquare size={28} />}
                title={isLoadingConvs ? "Chargement..." : "Sélectionne une discussion"}
                description="Choisis un interlocuteur dans la liste de gauche pour échanger."
              />
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
        </>
      )}
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
