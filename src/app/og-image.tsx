import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VoteToFeed — Vote for adorable pets. Feed shelter pets.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #fff7f6 0%, #ffffff 48%, #ecfeff 100%)",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(232,69,60,0.18), transparent 34%), radial-gradient(circle at bottom left, rgba(46,196,182,0.22), transparent 38%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(232,69,60,0.10)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: -120,
            bottom: -150,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(46,196,182,0.12)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "56px 64px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 700,
              height: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 24,
                  background: "#ffffff",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="52" height="52" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 20 Q6 29 18 29 Q30 29 30 20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <line x1="18" y1="29" x2="18" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="12" y1="32" x2="24" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="5" y1="20" x2="31" y2="20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M18 16 C18 16 14 12.5 14 10.5 C14 9 15.2 8 16.5 8 C17.2 8 17.8 8.4 18 8.9 C18.2 8.4 18.8 8 19.5 8 C20.8 8 22 9 22 10.5 C22 12.5 18 16 18 16Z" fill="#E8453C" />
                </svg>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>VoteToFeed</div>
                <div style={{ fontSize: 22, color: "#334155", marginTop: 6 }}>
                  Every vote helps shelter pets
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2.5 }}>
                Vote for adorable pets.
              </div>
              <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1.02, color: "#E8453C", letterSpacing: -2.5 }}>
                Feed shelter pets.
              </div>
              <div style={{ fontSize: 28, color: "#334155", marginTop: 6, maxWidth: 660, lineHeight: 1.35 }}>
                Free photo contests with prize packs worth up to $2,000.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 22px",
                  borderRadius: 9999,
                  background: "#E8453C",
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                Powered by iHeartDogs & iHeartCats
              </div>
            </div>
          </div>

          <div
            style={{
              width: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 280,
                height: 360,
                borderRadius: 36,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
                border: "1px solid rgba(15,23,42,0.08)",
                display: "flex",
                flexDirection: "column",
                padding: 26,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>This Week</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f766e",
                    background: "#ccfbf1",
                    padding: "8px 14px",
                    borderRadius: 9999,
                  }}
                >
                  Live
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  marginTop: 10,
                }}
              >
                {[
                  ["🐶", "Bear", "7 votes"],
                  ["🐕", "Sadie", "4 votes"],
                  ["🐱", "Atlas", "4 votes"],
                ].map(([emoji, name, votes], index) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 20,
                      background: index === 0 ? "#fff1f0" : "#f8fafc",
                      border: "1px solid rgba(15,23,42,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        background: "#ffffff",
                      }}
                    >
                      {emoji}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{name}</div>
                      <div style={{ fontSize: 18, color: "#475569" }}>{votes}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 18px",
                  borderRadius: 20,
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                Add your pet — free
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
