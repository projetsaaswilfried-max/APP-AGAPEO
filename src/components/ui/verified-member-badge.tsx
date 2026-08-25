"use client";

import { useState } from "react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck } from "lucide-react";

interface VerifiedMemberBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * Badge "membre vérifié" (rose) cliquable : au survol, une info-bulle ; au
 * clic, un pop-up qui explique ce que la vérification signifie vraiment —
 * plutôt qu'un simple pictogramme dont personne ne sait ce qu'il garantit.
 */
export function VerifiedMemberBadge({ size = "xs" }: VerifiedMemberBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="inline-flex shrink-0 cursor-pointer"
        title="Profil vérifié par l'équipe Agapeo"
      >
        <VerifiedBadge size={size} ring={false} title="Profil vérifié par l'équipe Agapeo" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Profil vérifié" maxWidth="sm">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="p-3 rounded-full bg-[#FE70B2]/10 text-[#FE70B2]">
            <ShieldCheck size={24} />
          </div>
          <p className="text-sm text-foreground">
            Ce profil a été <strong>validé par l&apos;équipe Agapeo</strong> : sa photo de vérification (selfie en direct) a été
            comparée à ses photos de profil, et ses informations ont été examinées manuellement avant d&apos;apparaître dans
            Découvrir.
          </p>
        </div>
      </Modal>
    </>
  );
}
