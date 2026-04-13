import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emailShell } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

// POST /api/admin/emails/generate — AI-generate email from a prompt using Gemini
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  const { prompt, includeImage } = await req.json();
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json({ error: "Prompt must be at least 5 characters" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";

  try {
    // Step 1: Generate email content with Gemini
    const textRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an email marketing expert for VoteToFeed, a pet contest platform where every vote feeds a shelter pet. Generate an email based on this request:

"${prompt.trim()}"

RULES:
- Write compelling, emotional, action-driven copy
- Brand voice: warm, pet-as-family, playful not corporate
- Always include a clear call-to-action
- Use emojis sparingly but effectively
- Keep it concise — no fluff
- Use {{userName}} for personalization and {{petName}} for the pet name
- The app URL is ${appUrl}

Return ONLY a JSON object with these fields (no markdown, no code fences):
{
  "subject": "Email subject line with emoji",
  "preheader": "Short preview text for email clients",
  "heading": "Main heading (H1)",
  "body": "HTML body content — use <p>, <strong>, <br/> tags. NO <style> or <div>. Keep inline styles minimal.",
  "ctaLabel": "Button text",
  "ctaUrl": "Button URL",
  "ctaColor": "Hex color for button (default #ef4444)",
  "infoBoxContent": "Optional highlighted box content (or null)",
  "infoBoxBg": "Optional background color (or null)",
  "infoBoxBorder": "Optional border color (or null)"
}`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!textRes.ok) {
      const errText = await textRes.text();
      console.error("Gemini text generation failed:", errText);
      return NextResponse.json({ error: "AI generation failed. Check Gemini API key." }, { status: 500 });
    }

    const textData = await textRes.json();
    const rawText = textData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response (handle possible markdown wrapping)
    let emailContent;
    try {
      const jsonStr = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      emailContent = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return NextResponse.json({ error: "AI returned invalid format. Try rephrasing your prompt." }, { status: 500 });
    }

    // Step 2: Optionally generate an image
    let imageHtml = "";
    if (includeImage) {
      try {
        const imgPrompt = `Create a warm, professional email banner image for a pet contest email. Theme: ${prompt.trim().slice(0, 200)}. Style: Cute pets, vibrant colors, heartwarming, no text overlay. Professional email marketing quality. 600px wide.`;

        const imgRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              instances: [{ prompt: imgPrompt }],
              parameters: { sampleCount: 1, aspectRatio: "16:9" },
            }),
          }
        );

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const base64 =
            imgData?.predictions?.[0]?.bytesBase64Encoded ||
            imgData?.outputs?.[0]?.bytesBase64Encoded ||
            null;

          if (base64) {
            imageHtml = `<img src="data:image/jpeg;base64,${base64}" alt="Email banner" style="width:100%;max-width:520px;border-radius:12px;margin:0 0 20px;" />`;
          }
        }
      } catch (imgErr) {
        console.error("Image generation failed (non-fatal):", imgErr);
        // Continue without image — not a blocker
      }
    }

    // Step 3: Assemble into emailShell
    const infoBoxHtml = emailContent.infoBoxContent
      ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
  <tr>
    <td style="background:${emailContent.infoBoxBg || "#fef2f2"};border-left:4px solid ${emailContent.infoBoxBorder || "#fca5a5"};border-radius:0 8px 8px 0;padding:16px 20px;font-size:15px;line-height:1.6;color:#18181b;">
      ${emailContent.infoBoxContent}
    </td>
  </tr>
</table>`
      : "";

    const ctaHtml = emailContent.ctaLabel
      ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;margin-bottom:8px;">
  <tr>
    <td style="border-radius:10px;background:${emailContent.ctaColor || "#ef4444"};" bgcolor="${emailContent.ctaColor || "#ef4444"}">
      <a href="${emailContent.ctaUrl || appUrl}" target="_blank"
         style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
        ${emailContent.ctaLabel} →
      </a>
    </td>
  </tr>
</table>`
      : "";

    const bodyContent = `
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">VoteToFeed</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${emailContent.heading || "Hey there!"}</h1>
      ${imageHtml}
      ${emailContent.body || ""}
      ${infoBoxHtml}
      ${ctaHtml}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Every vote feeds shelter pets — you're making a difference.</p>
    `;

    const html = emailShell(bodyContent, emailContent.preheader || "");

    return NextResponse.json({
      subject: emailContent.subject || "VoteToFeed Update",
      html,
      prompt: prompt.trim(),
      hasImage: !!imageHtml,
    });
  } catch (error) {
    console.error("Email generation failed:", error);
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
