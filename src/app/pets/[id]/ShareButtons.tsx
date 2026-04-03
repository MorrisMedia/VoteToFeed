"use client";

import { useState, useCallback } from "react";
import { trackVoteToFeedEvent } from "@/lib/meta-pixel";

export function ShareButtons({
  petName,
  petId,
  petPhoto,
  appUrl,
}: {
  petName: string;
  petId: string;
  petPhoto: string;
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  // Use absolute URL for share links to ensure Facebook share button works correctly
  const url = `${appUrl}/pets/${petId}`;
  const text = `Vote for ${petName} to win! Every vote helps feed shelter pets 🐾❤️`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const handleFacebookShare = useCallback(() => {
    trackVoteToFeedEvent("Share", {
      content_name: "VoteToFeed_SocialShare",
      content_category: "VoteToFeed_Viral",
      value: 0.10,
    });

    // Use FB SDK dialog if available (works better on mobile)
    const fb = (window as unknown as { FB?: { ui: (params: Record<string, string>) => void } }).FB;
    if (fb) {
      fb.ui({
        method: "share",
        href: url,
        quote: text,
      });
      return;
    }

    // Use Facebook Share Dialog (not sharer.php) — properly opens share post in Facebook app on mobile
    const fbAppId = "949563544407594";
    const shareUrl = `https://www.facebook.com/dialog/share?app_id=${fbAppId}&href=${encodedUrl}&quote=${encodedText}&display=popup&redirect_uri=${encodedUrl}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    }
  }, [url, text, encodedUrl, encodedText]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      trackVoteToFeedEvent("Share", {
        content_name: "VoteToFeed_SocialShare",
        content_category: "VoteToFeed_Viral",
        value: 0.10,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      trackVoteToFeedEvent("Share", {
        content_name: "VoteToFeed_SocialShare",
        content_category: "VoteToFeed_Viral",
        value: 0.10,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
        Share, Get More Votes &amp; Feed More Shelter Pets
      </p>
      {/* 3 buttons in a single compact row */}
      <div className="grid grid-cols-3 gap-2">

        {/* Copy Link */}
        <button
          onClick={copyLink}
          className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-sm font-bold transition-all ${
            copied
              ? "bg-accent-50 text-accent-700 border-2 border-accent-300"
              : "bg-surface-100 text-surface-800 hover:bg-surface-200 border-2 border-surface-200"
          }`}
        >
          {copied ? (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent-600"><path d="M20 6L9 17l-5-5"/></svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              <span>Copy Link</span>
            </>
          )}
        </button>

        {/* Facebook */}
        <button
          onClick={handleFacebookShare}
          className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-sm font-bold bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          <span>Facebook</span>
        </button>

        {/* Text / iMessage */}
        <a
          href={`sms:?&body=${encodedText}%20${encodedUrl}`}
          onClick={() => trackVoteToFeedEvent("Share", {
            content_name: "VoteToFeed_SocialShare",
            content_category: "VoteToFeed_Viral",
            value: 0.10,
          })}
          className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-sm font-bold bg-accent-500 text-white hover:bg-accent-600 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>Text</span>
        </a>

      </div>
    </div>
  );
}
