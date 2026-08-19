/** Contenu partagé par opengraph-image.tsx et twitter-image.tsx (Satori/next-og
 * n'accepte que du flexbox explicite — pas de layout block implicite). */
export function OgImageContent() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        background: "linear-gradient(135deg, #FF6FA0 0%, #E83E75 55%, #C22F5E 100%)",
        padding: "90px"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          display: "flex"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -140,
          right: 140,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          display: "flex"
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
        <div
          style={{
            display: "flex",
            fontSize: 90,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.03em"
          }}
        >
          AGAPEO
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 500,
            color: "rgba(255,255,255,0.94)",
            marginTop: 22,
            lineHeight: 1.4
          }}
        >
          Rencontres chrétiennes pensées pour le mariage
        </div>
      </div>
    </div>
  );
}
