"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  image: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  hasPassword: boolean;
  isOAuth: boolean;
  oauthProviders: string[];
  createdAt: string;
  petCount: number;
  voteCount: number;
};

type Tab = "profile" | "password";

export function ProfileClient({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile fields
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(user.city);
  const [state, setState] = useState(user.state);
  const [country, setCountry] = useState(user.country);
  const [zipCode, setZipCode] = useState(user.zipCode);
  const [image, setImage] = useState(user.image);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Photo upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProfileMsg(null);

    try {
      const formData = new FormData();
      formData.append("photos", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setProfileMsg({ type: "error", text: data.error || "Upload failed" });
        return;
      }

      const { urls } = await uploadRes.json();
      const uploadedUrl = urls[0];

      // Save to profile
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: uploadedUrl }),
      });

      if (res.ok) {
        setImage(uploadedUrl);
        setProfileMsg({ type: "success", text: "Profile photo updated!" });
        router.refresh();
      } else {
        const data = await res.json();
        setProfileMsg({ type: "error", text: data.error || "Failed to save photo" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: "" }),
      });
      if (res.ok) {
        setImage("");
        setProfileMsg({ type: "success", text: "Photo removed" });
        router.refresh();
      }
    } catch {
      setProfileMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, state, country, zipCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile updated!" });
        router.refresh();
      } else {
        setProfileMsg({ type: "error", text: data.error || "Update failed" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 8) {
      setPwMsg({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "Passwords do not match" });
      return;
    }

    setSavingPw(true);

    try {
      const body: Record<string, string> = { newPassword };
      if (user.hasPassword) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "success", text: user.hasPassword ? "Password changed!" : "Password set! You can now log in with email + password." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMsg({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch {
      setPwMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-surface-400 hover:text-surface-600 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Account Settings</h1>
      </div>

      {/* Profile card top */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 h-24 relative" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-surface-100 flex items-center justify-center">
                {image ? (
                  <img src={image} alt={name || "Profile"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-brand-500">
                    {(name || user.email || "U")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="pb-1">
              <h2 className="text-lg font-bold text-surface-900">{name || "No name set"}</h2>
              <p className="text-sm text-surface-500">{user.email}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-surface-100">
            <div className="text-center">
              <p className="text-lg font-bold text-surface-900">{user.petCount}</p>
              <p className="text-xs text-surface-400">Pets</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-surface-900">{user.voteCount}</p>
              <p className="text-xs text-surface-400">Votes Cast</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-surface-600">{memberSince}</p>
              <p className="text-xs text-surface-400">Member Since</p>
            </div>
          </div>

          {image && (
            <button
              onClick={handleRemovePhoto}
              disabled={saving}
              className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Remove photo
            </button>
          )}

          {user.isOAuth && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-surface-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Linked with {user.oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-6">
        <button
          onClick={() => setTab("profile")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            tab === "profile"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          Profile Info
        </button>
        <button
          onClick={() => setTab("password")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            tab === "password"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          Password
        </button>
      </div>

      {/* Messages */}
      {tab === "profile" && profileMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          profileMsg.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {profileMsg.text}
        </div>
      )}
      {tab === "password" && pwMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          pwMsg.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {pwMsg.text}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl border border-surface-200 bg-surface-100 px-4 py-3 text-sm text-surface-500 cursor-not-allowed"
            />
            <p className="text-xs text-surface-400 mt-1">Email cannot be changed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                maxLength={100}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                maxLength={100}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                maxLength={100}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">Zip Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Zip code"
                maxLength={20}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-60 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {/* Password tab */}
      {tab === "password" && (
        <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-5">
          {user.isOAuth && !user.hasPassword && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              You signed up with {user.oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}. Set a password below to also log in with email + password.
            </div>
          )}

          {user.hasPassword && (
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">
              {user.hasPassword ? "New Password" : "Set Password"}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              minLength={8}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={savingPw || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-60 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {savingPw ? "Saving..." : user.hasPassword ? "Change Password" : "Set Password"}
          </button>
        </form>
      )}
    </div>
  );
}
