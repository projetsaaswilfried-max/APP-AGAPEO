"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { env } from "@/config/env";

/**
 * Meta Pixel — chargé une seule fois pour tout le site (placé dans le layout
 * racine, cf. app/layout.tsx). Le script officiel ne déclenche 'PageView'
 * qu'au chargement initial du document ; comme l'app navigue ensuite côté
 * client (App Router), on redéclenche 'PageView' nous-mêmes à chaque
 * changement de route pour que chaque page vue compte vraiment côté Meta.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Le script d'init ci-dessous déclenche déjà 'PageView' au premier chargement.
      isFirstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!env.metaPixelId) return null;

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${env.metaPixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${env.metaPixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
