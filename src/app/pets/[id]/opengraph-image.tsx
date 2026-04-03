import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "Vote for this pet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { id: string } }) {
  const weekId = getCurrentWeekId();

  const pet = await prisma.pet.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      breed: true,
      photos: true,
      weeklyStats: { where: { weekId }, take: 1 },
    },
  });

  const name = pet?.name || "This Pet";
  const breed = pet?.breed || "";
  const votes = String(pet?.weeklyStats?.[0]?.totalVotes ?? 0);
  const rank = pet?.weeklyStats?.[0]?.rank ? String(pet.weeklyStats[0].rank) : "";
  const photo = pet?.photos?.[0] || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Pet photo - left side */}
        <div
          style={{
            width: "500px",
            height: "630px",
            display: "flex",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              style={{
                width: "500px",
                height: "630px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "500px",
                height: "630px",
                background: "linear-gradient(135deg, #374151, #1f2937)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "120px",
              }}
            >
              🐾
            </div>
          )}
          {/* Gradient overlay for blending */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "150px",
              height: "630px",
              background: "linear-gradient(to right, transparent, #16213e)",
              display: "flex",
            }}
          />
        </div>

        {/* Right side content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "50px 60px 50px 20px",
          }}
        >
          {/* Vote to Feed branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 20 Q6 29 18 29 Q30 29 30 20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <line x1="18" y1="29" x2="18" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="12" y1="32" x2="24" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="5" y1="20" x2="31" y2="20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 16 C18 16 14 12.5 14 10.5 C14 9 15.2 8 16.5 8 C17.2 8 17.8 8.4 18 8.9 C18.2 8.4 18.8 8 19.5 8 C20.8 8 22 9 22 10.5 C22 12.5 18 16 18 16Z" fill="#E8453C"/>
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.5px",
                }}
              >
                Vote to Feed
              </span>
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                Powered by iHeartDogs &amp; iHeartCats
              </span>
            </div>
          </div>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <span
              style={{
                color: "#f87171",
                fontSize: "20px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "3px",
              }}
            >
              VOTE FOR
            </span>
            <span
              style={{
                color: "#ffffff",
                fontSize: name.length > 12 ? "52px" : "64px",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-2px",
              }}
            >
              {name}
            </span>
            <span
              style={{
                color: "#e2e8f0",
                fontSize: "28px",
                fontWeight: 600,
                marginTop: "4px",
              }}
            >
              to win! 🏆
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "32px",
            }}
          >
            {rank && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(248, 113, 113, 0.15)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: "12px",
                  padding: "8px 16px",
                }}
              >
                <span style={{ fontSize: "20px" }}>🏆</span>
                <span
                  style={{ color: "#fca5a5", fontSize: "18px", fontWeight: 700 }}
                >
                  #{rank}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "8px 16px",
              }}
            >
              <span style={{ fontSize: "20px" }}>🐾</span>
              <span
                style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: 700 }}
              >
                {Number(votes).toLocaleString()} votes
              </span>
            </div>
            {breed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "8px 16px",
                }}
              >
                <span
                  style={{ color: "#94a3b8", fontSize: "16px", fontWeight: 500 }}
                >
                  {breed}
                </span>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "36px",
              background: "linear-gradient(90deg, #ef4444, #dc2626)",
              borderRadius: "14px",
              padding: "20px 28px",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              Every vote helps feed shelter pets
            </span>
            <span style={{ fontSize: "24px" }}>❤️</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
