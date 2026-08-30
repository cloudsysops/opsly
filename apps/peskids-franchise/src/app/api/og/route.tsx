import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.NEXTAUTH_URL || "https://franchising.acmefranchise.com";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #2D2F8E 0%, #6A469D 50%, #2D2F8E 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(80, 200, 223, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "rgba(106, 70, 157, 0.3)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "40px 60px",
            position: "relative",
          }}
        >
          {/* Logo */}
          <img
            src={`${baseUrl}/logo/logo.svg`}
            width={280}
            height={140}
            style={{ objectFit: "contain", marginBottom: "16px" }}
          />

          {/* Headline */}
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "white",
              textAlign: "center",
              lineHeight: 1.15,
              marginBottom: "12px",
              letterSpacing: "-1px",
            }}
          >
            Own a Children&#39;s Chess
          </div>
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#50C8DF",
              textAlign: "center",
              lineHeight: 1.15,
              marginBottom: "20px",
              letterSpacing: "-1px",
            }}
          >
            Education Franchise
          </div>

          {/* Subtext */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.4,
              marginBottom: "24px",
            }}
          >
            Build a rewarding business teaching chess to young children with a
            proven curriculum and comprehensive support.
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "48px",
              marginBottom: "8px",
            }}
          >
            {[
              { value: "7+", label: "Markets" },
              { value: "500K+", label: "Students Taught" },
              { value: "100+", label: "Partner Schools" },
              { value: "15+", label: "Years" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    color: "#FACC29",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.6)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "1px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Characters at bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
          }}
        >
          <img
            src={`${baseUrl}/images/characters/team-illustration.svg`}
            width={800}
            height={80}
            style={{ objectFit: "contain", opacity: 0.9 }}
          />
        </div>

        {/* URL bar at very bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            background: "rgba(0, 0, 0, 0.3)",
            padding: "8px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.7)",
              letterSpacing: "1px",
            }}
          >
            franchising.acmefranchise.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
