"use client";

import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getCreativeSource, trackPetEntryEvent, trackVoteToFeedEvent } from "@/lib/meta-pixel";
import { trackPostHogEvent } from "@/lib/analytics";
import { US_STATES } from "@/lib/utils";

type BreedOption = { id: string; name: string; petType: string; slug: string };

type ContestOption = {
  id: string;
  name: string;
  type: string;
  petType: string;
  description: string | null;
  rules: string | null;
  coverImage: string | null;
  startDate: string;
  endDate: string;
  entryFee: number;
  entryCount: number;
  daysLeft: number;
  totalPrizeValue: number;
  prizeDescription: string | null;
  sponsorName: string | null;
  isFeatured: boolean;
  prizes: { placement: number; title: string; value: number; items: string[] }[];
};

function useDropdownAutoClose(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, ref]);
}

export default function NewPetPage() {
  const { status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const breedDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [breeds, setBreeds] = useState<BreedOption[]>([]);
  const [breedSearch, setBreedSearch] = useState("");
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [contests, setContests] = useState<ContestOption[]>([]);
  const [selectedContests, setSelectedContests] = useState<Set<string>>(new Set());
  const [expandedContest, setExpandedContest] = useState<string | null>(null);

  const closeBreedDropdown = useCallback(() => setBreedDropdownOpen(false), []);

  useDropdownAutoClose(breedDropdownRef, breedDropdownOpen, closeBreedDropdown);

  const [form, setForm] = useState({
    name: "",
    type: "DOG" as "DOG" | "CAT" | "OTHER",
    breed: "",
    bio: "",
    ownerFirstName: "",
    ownerLastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    trackPostHogEvent("pet_entry_page_viewed", {
      pet_type: form.type,
    });
  }, [status]);

  useEffect(() => {
    if (form.type === "OTHER") {
      setBreeds([]);
      return;
    }
    fetch(`/api/breeds?type=${form.type}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBreeds(data); })
      .catch(() => {});
  }, [form.type]);

  useEffect(() => {
    if (form.type === "OTHER") {
      setContests([]);
      setSelectedContests(new Set());
      return;
    }
    fetch(`/api/contests?petType=${form.type}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContests(data);
          const nationals = data.filter((c: ContestOption) => c.type === "NATIONAL");
          setSelectedContests(new Set(nationals.map((c: ContestOption) => c.id)));
        }
      })
      .catch(() => {});
  }, [form.type]);

  const filteredBreeds = breedSearch
    ? breeds.filter((b) => b.name.toLowerCase().includes(breedSearch.toLowerCase()))
    : breeds;

  function toggleContest(id: string) {
    setSelectedContests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      trackPostHogEvent("pet_entry_contest_toggled", {
        contest_id: id,
        selected_count: next.size,
      });
      return next;
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - photos.length;
    if (remaining <= 0) {
      setError("Maximum 5 photos allowed");
      trackPostHogEvent("pet_entry_validation_failed", {
        reason: "max_photos_reached",
      });
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remaining);
    const validExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const heicExts = [".heic", ".heif"];

    trackPostHogEvent("pet_photo_upload_started", {
      pet_type: form.type,
      selected_file_count: selectedFiles.length,
      existing_photo_count: photos.length,
    });

    for (const file of selectedFiles) {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      if (heicExts.includes(ext)) {
        const message = `HEIC photos aren't supported. Please convert ${file.name} to JPG or PNG first (on iPhone: Settings → Camera → Formats → Most Compatible).`;
        setError(message);
        trackPostHogEvent("pet_photo_upload_failed", {
          reason: "heic_not_supported",
          file_name: file.name,
        });
        return;
      }
      if (!validExts.includes(ext)) {
        setError(`Unsupported file: ${file.name}. Use JPG, PNG, GIF, or WebP.`);
        trackPostHogEvent("pet_photo_upload_failed", {
          reason: "unsupported_file_type",
          file_name: file.name,
        });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Max 20MB per file.`);
        trackPostHogEvent("pet_photo_upload_failed", {
          reason: "file_too_large",
          file_name: file.name,
          file_size_bytes: file.size,
        });
        return;
      }
    }

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("photos", file));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        trackPostHogEvent("pet_photo_upload_failed", {
          reason: data.error || "Upload failed",
          status_code: res.status,
        });
        setUploading(false);
        return;
      }
      const newPhotos = data.urls.map((url: string, i: number) => ({
        url, name: selectedFiles[i]?.name || `Photo ${photos.length + i + 1}`,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
      trackVoteToFeedEvent("Lead", {
        content_name: "VoteToFeed_PhotoUpload",
        content_category: "VoteToFeed",
        source: getCreativeSource(form.breed || form.type),
        value: 1,
      });
      trackPostHogEvent("pet_photo_upload_completed", {
        pet_type: form.type,
        breed: form.breed || undefined,
        photo_count_added: newPhotos.length,
        total_photo_count: photos.length + newPhotos.length,
      });
    } catch {
      setError("Upload failed. Please try again.");
      trackPostHogEvent("pet_photo_upload_failed", {
        reason: "network_or_server_error",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    trackPostHogEvent("pet_entry_submit_started", {
      pet_type: form.type,
      breed: form.breed || undefined,
      contest_count: selectedContests.size,
      photo_count: photos.length,
      has_bio: Boolean(form.bio),
      has_owner_name: Boolean(form.ownerFirstName && form.ownerLastName),
      has_address: Boolean(form.address),
      has_city: Boolean(form.city),
      has_state: Boolean(form.state),
      has_zip: Boolean(form.zipCode),
    });

    if (!form.ownerFirstName || !form.ownerLastName) {
      setError("First and last name are required");
      trackPostHogEvent("pet_entry_validation_failed", {
        reason: "missing_owner_name",
      });
      return;
    }
    if (photos.length === 0) {
      setError("Please upload at least one photo");
      trackPostHogEvent("pet_entry_validation_failed", {
        reason: "missing_photo",
      });
      return;
    }
    if (selectedContests.size === 0) {
      setError("Please select at least one contest to enter");
      trackPostHogEvent("pet_entry_validation_failed", {
        reason: "missing_contest_selection",
      });
      return;
    }

    setLoading(true);
    try {
      const ownerName = `${form.ownerFirstName} ${form.ownerLastName}`.trim();
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          breed: form.breed || undefined,
          bio: form.bio || undefined,
          ownerName,
          ownerFirstName: form.ownerFirstName,
          ownerLastName: form.ownerLastName,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zipCode: form.zipCode || undefined,
          photos: photos.map((p) => p.url),
          contestIds: Array.from(selectedContests),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add pet");
        trackPostHogEvent("pet_entry_failed", {
          reason: data.error || "Failed to add pet",
          status_code: res.status,
        });
        setLoading(false);
        return;
      }
      if (!data?.id) {
        setError("Pet created, but the site did not return a valid listing ID. Please check My Pets.");
        trackPostHogEvent("pet_entry_failed", {
          reason: "missing_pet_id_after_create",
        });
        setLoading(false);
        return;
      }

      const verifyRes = await fetch(`/api/pets/${data.id}`, { cache: "no-store" });
      if (!verifyRes.ok) {
        setError("Pet created, but we could not verify the new listing yet. Please check My Pets.");
        trackPostHogEvent("pet_entry_failed", {
          reason: "post_create_verify_failed",
          pet_id: data.id,
          status_code: verifyRes.status,
        });
        setLoading(false);
        return;
      }

      const verifiedPet = await verifyRes.json();
      if (verifiedPet?.name !== form.name || verifiedPet?.type !== form.type) {
        setError("The site returned the wrong listing after submit. Please open My Pets while we finish fixing this.");
        trackPostHogEvent("pet_entry_failed", {
          reason: "verified_pet_mismatch",
          pet_id: data.id,
        });
        setLoading(false);
        return;
      }

      trackPetEntryEvent({
        petId: data.id,
        petName: form.name,
        petType: form.type,
        contestCount: selectedContests.size,
        sourcePart: form.breed || form.type,
      });
      trackPostHogEvent("pet_entry_completed", {
        pet_id: data.id,
        pet_name: form.name,
        pet_type: form.type,
        breed: form.breed || undefined,
        contest_count: selectedContests.size,
        photo_count: photos.length,
        has_bio: Boolean(form.bio),
        has_address: Boolean(form.address),
        has_state: Boolean(form.state),
      });
      router.push(`/pets/${data.id}`);
    } catch {
      setError("Something went wrong");
      trackPostHogEvent("pet_entry_failed", {
        reason: "network_or_server_error",
      });
      setLoading(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-surface-500 mb-4">You need to log in to add a pet.</p>
        <Link href="/auth/signin?callbackUrl=/pets/new" className="btn-primary">Log in</Link>
      </div>
    );
  }

  const stateEntries = Object.entries(US_STATES).sort((a, b) => a[1].localeCompare(b[1]));

  function formatMoney(cents: number) {
    return `$${(cents / 100).toLocaleString()}`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function contestTypeLabel(type: string) {
    const map: Record<string, string> = {
      NATIONAL: "Weekly",
      SEASONAL: "Seasonal",
      CHARITY: "Charity",
      CALENDAR: "Calendar",
      BREED: "Breed",
      STATE: "Regional",
    };
    return map[type] || type;
  }

  function contestTypeBadgeColor(type: string) {
    const map: Record<string, string> = {
      NATIONAL: "bg-brand-100 text-brand-700",
      SEASONAL: "bg-amber-100 text-amber-700",
      CHARITY: "bg-emerald-100 text-emerald-700",
      CALENDAR: "bg-violet-100 text-violet-700",
      BREED: "bg-sky-100 text-sky-700",
      STATE: "bg-orange-100 text-orange-700",
    };
    return map[type] || "bg-surface-100 text-surface-600";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-brand-600 font-medium mb-6 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mb-1">Add your pet</h1>
      <p className="text-sm text-surface-500 mb-6">Free to submit. Choose which contests to enter below.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Pet name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={60} placeholder="e.g. Buddy" className="input-field" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Pet type *</label>
          <div className="grid grid-cols-3 gap-2">
            {(["DOG", "CAT", "OTHER"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setForm((f) => ({ ...f, type: t, breed: "" })); setBreedSearch(""); trackPostHogEvent("pet_entry_pet_type_selected", { pet_type: t }); }} className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === t ? "bg-brand-500 text-white shadow-sm" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
                {t === "DOG" ? "🐶 Dog" : t === "CAT" ? "🐱 Cat" : "🐾 Other"}
              </button>
            ))}
          </div>
        </div>

        {form.type !== "OTHER" && (
          <div className="relative" ref={breedDropdownRef}>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Breed *</label>
            <div className="relative">
              <input type="text" value={breedDropdownOpen ? breedSearch : form.breed} onClick={() => { setBreedDropdownOpen((open) => { const nextOpen = !open; if (nextOpen) setBreedSearch(form.breed); return nextOpen; }); }} onChange={(e) => { setBreedSearch(e.target.value); if (!breedDropdownOpen) setBreedDropdownOpen(true); }} placeholder={`Search ${form.type === "DOG" ? "dog" : "cat"} breeds...`} className="input-field pr-10" autoComplete="off" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {breedDropdownOpen && (
              <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-surface-200 rounded-xl shadow-lg py-1">
                {filteredBreeds.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-surface-400">No breeds found</li>
                ) : (
                  filteredBreeds.map((b) => (
                    <li key={b.id}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setForm((f) => ({ ...f, breed: b.name })); setBreedSearch(b.name); closeBreedDropdown(); trackPostHogEvent("pet_entry_breed_selected", { pet_type: form.type, breed: b.name }); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-50 transition-colors ${form.breed === b.name ? "bg-brand-50 text-brand-700 font-medium" : "text-surface-700"} ${b.name.startsWith("Other") ? "font-semibold border-b border-surface-100" : ""}`}>
                        {b.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Bio (optional)</label>
          <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={255} rows={3} placeholder="Tell us about your pet..." className="input-field resize-none" />
          <p className="text-xs text-surface-400 mt-1 text-right">{form.bio.length}/255</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Photos * <span className="text-surface-400 font-normal">({photos.length}/5)</span></label>
          {photos.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 hide-scrollbar">
              {photos.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-surface-100 group">
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-brand-500 text-white px-1 py-0.5 rounded">Main</span>}
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? "border-brand-300 bg-brand-50" : "border-surface-200 hover:border-brand-300 hover:bg-brand-50/30"}`}>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp" onChange={handleFileSelect} className="hidden" />
              {uploading ? (
                <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /><span className="text-sm text-brand-600 font-medium">Uploading...</span></div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-400 mb-2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <p className="text-sm font-medium text-surface-700">Tap to upload photos</p>
                  <p className="text-xs text-surface-400 mt-1">JPG, PNG, GIF, WebP · Up to 20MB each</p>
                </>
              )}
            </div>
          )}
        </div>

        {form.type !== "OTHER" && contests.length > 0 && (
          <div className="border-t border-surface-100 pt-5">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Enter Contests</p>
            <p className="text-sm text-surface-500 mb-4">Select which contests you'd like your pet to compete in. National weekly contest is selected by default.</p>

            <div className="space-y-3">
              {contests.map((contest) => {
                const isSelected = selectedContests.has(contest.id);
                const isExpanded = expandedContest === contest.id;

                return (
                  <div key={contest.id} className={`rounded-xl border-2 transition-all overflow-hidden ${isSelected ? "border-brand-400 bg-brand-50/40 shadow-sm" : "border-surface-200 bg-white hover:border-surface-300"}`}>
                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => toggleContest(contest.id)}>
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "bg-brand-500 border-brand-500" : "border-surface-300"}`}>
                        {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-surface-900 text-sm">{contest.name}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${contestTypeBadgeColor(contest.type)}`}>{contestTypeLabel(contest.type)}</span>
                          {contest.isFeatured && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Featured</span>}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-surface-500 flex-wrap">
                          <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{contest.daysLeft} days left</span>
                          <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>{contest.entryCount} entered</span>
                          {contest.totalPrizeValue > 0 && <span className="flex items-center gap-1 font-medium text-emerald-600"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/></svg>{formatMoney(contest.totalPrizeValue)} in prizes</span>}
                          {contest.entryFee === 0 && <span className="text-emerald-600 font-medium">Free entry</span>}
                        </div>
                      </div>

                      <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedContest(isExpanded ? null : contest.id); }} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-surface-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-surface-100 bg-white">
                        {contest.coverImage && <img src={contest.coverImage} alt="" className="w-full h-32 sm:h-40 object-cover" />}

                        <div className="p-4 space-y-3">
                          {contest.description && <p className="text-sm text-surface-600 leading-relaxed">{contest.description}</p>}

                          <div className="flex items-center gap-4 text-xs text-surface-500"><span><span className="font-medium text-surface-700">Starts:</span> {formatDate(contest.startDate)}</span><span><span className="font-medium text-surface-700">Ends:</span> {formatDate(contest.endDate)}</span></div>

                          {contest.rules && <div><p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Rules</p><p className="text-xs text-surface-500 leading-relaxed">{contest.rules}</p></div>}

                          {contest.prizes.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Prizes</p>
                              <div className="space-y-2">
                                {contest.prizes.map((prize) => (
                                  <div key={prize.placement} className="flex items-start gap-2">
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${prize.placement === 1 ? "bg-yellow-100 text-yellow-700" : prize.placement === 2 ? "bg-surface-200 text-surface-600" : "bg-orange-100 text-orange-700"}`}>{prize.placement}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2"><span className="text-sm font-medium text-surface-800">{prize.title}</span><span className="text-xs font-semibold text-emerald-600">{formatMoney(prize.value)}</span></div>
                                      {prize.items.length > 0 && <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{prize.items.join(" · ")}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {contest.prizes.length === 0 && contest.prizeDescription && <div><p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Prizes</p><p className="text-sm text-surface-600">{contest.prizeDescription}</p></div>}

                          {contest.sponsorName && <div className="flex items-center gap-2 pt-1"><span className="text-xs text-surface-400">Sponsored by</span><span className="text-xs font-semibold text-surface-700">{contest.sponsorName}</span></div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-surface-400 mt-2">{selectedContests.size} contest{selectedContests.size !== 1 ? "s" : ""} selected</p>
          </div>
        )}

        <div className="border-t border-surface-100 pt-5"><p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-4">Owner Information (for prizes)</p></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">First name *</label><input type="text" value={form.ownerFirstName} onChange={(e) => setForm((f) => ({ ...f, ownerFirstName: e.target.value }))} placeholder="First name" className="input-field" required autoComplete="given-name" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Last name *</label><input type="text" value={form.ownerLastName} onChange={(e) => setForm((f) => ({ ...f, ownerLastName: e.target.value }))} placeholder="Last name" className="input-field" required autoComplete="family-name" /></div>
        </div>

        <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Street address</label><input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main Street, Apt 4B" className="input-field" autoComplete="street-address" /></div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">City</label><input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="input-field" autoComplete="address-level2" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">State</label><select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="input-field" autoComplete="address-level1"><option value="">Select state</option>{stateEntries.map(([abbr, name]) => (<option key={abbr} value={abbr}>{name}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">ZIP code</label><input type="text" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="ZIP" maxLength={10} className="input-field" autoComplete="postal-code" /></div>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={loading || uploading} className="w-full btn-primary py-3 text-base disabled:opacity-50">{loading ? "Adding pet..." : `Enter ${selectedContests.size} contest${selectedContests.size !== 1 ? "s" : ""} — free`}</button>
      </form>
    </div>
  );
}
