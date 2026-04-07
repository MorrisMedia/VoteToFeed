"use client";

import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trackPostHogEvent } from "@/lib/analytics";
import { US_STATES } from "@/lib/utils";

type BreedOption = { id: string; name: string; petType: string; slug: string };

function useDropdownAutoClose(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
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

export default function EditPetPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const petId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const breedDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fatalError, setFatalError] = useState("");
  const [success, setSuccess] = useState("");
  const [breeds, setBreeds] = useState<BreedOption[]>([]);
  const [breedSearch, setBreedSearch] = useState("");
  const [breedDropdownOpen, setBreedDropdownOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [petType, setPetType] = useState<"DOG" | "CAT" | "OTHER">("DOG");

  const [form, setForm] = useState({
    name: "",
    breed: "",
    bio: "",
    ownerFirstName: "",
    ownerLastName: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const closeBreedDropdown = useCallback(() => setBreedDropdownOpen(false), []);
  useDropdownAutoClose(breedDropdownRef, breedDropdownOpen, closeBreedDropdown);

  // Load pet data
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/pets/${petId}/edit`);
      return;
    }

    const loadPet = async () => {
      try {
        const res = await fetch(`/api/pets/${petId}`);
        if (!res.ok) {
          setFatalError("Pet not found or you don't have permission to edit it.");
          setLoading(false);
          return;
        }
        const pet = await res.json();

        // Check ownership via separate call
        const profileRes = await fetch("/api/users/profile");
        if (!profileRes.ok) {
          setFatalError("Unable to verify ownership. Please try again.");
          setLoading(false);
          return;
        }
        const profile = await profileRes.json();
        if (pet.userId !== profile.id) {
          setFatalError("You can only edit your own pets.");
          setLoading(false);
          return;
        }

        setPetType(pet.type);
        setPhotos(pet.photos || []);

        const nameParts = (pet.ownerName || "").split(" ");
        setForm({
          name: pet.name || "",
          breed: pet.breed || "",
          bio: pet.bio || "",
          ownerFirstName: pet.ownerFirstName || nameParts[0] || "",
          ownerLastName: pet.ownerLastName || nameParts.slice(1).join(" ") || "",
          city: pet.city || "",
          state: pet.state || "",
          zipCode: pet.zipCode || "",
        });
        setLoading(false);
      } catch {
        setError("Failed to load pet data.");
        setLoading(false);
      }
    };

    loadPet();
  }, [status, petId, router]);

  // Load breeds when type is known
  useEffect(() => {
    if (petType === "OTHER") { setBreeds([]); return; }
    fetch(`/api/breeds?type=${petType}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBreeds(data); })
      .catch(() => {});
  }, [petType]);

  const filteredBreeds = breedSearch
    ? breeds.filter((b) => b.name.toLowerCase().includes(breedSearch.toLowerCase()))
    : breeds;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - photos.length;
    if (remaining <= 0) { setError("Maximum 5 photos allowed"); return; }

    const selectedFiles = Array.from(files).slice(0, remaining);
    const validExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    for (const file of selectedFiles) {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      if (!validExts.includes(ext)) { setError(`Unsupported file: ${file.name}. Use JPG, PNG, GIF, or WebP.`); return; }
      if (file.size > 20 * 1024 * 1024) { setError(`File too large: ${file.name}. Max 20MB per file.`); return; }
    }

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("photos", file));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); setUploading(false); return; }
      setPhotos((prev) => [...prev, ...data.urls]);
    } catch {
      setError("Upload failed. Please try again.");
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
    setSuccess("");

    if (!form.name.trim()) { setError("Pet name is required"); return; }
    if (photos.length === 0) { setError("At least one photo is required"); return; }

    setSaving(true);
    try {
      const ownerName = `${form.ownerFirstName} ${form.ownerLastName}`.trim();
      const res = await fetch(`/api/pets/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          breed: form.breed || undefined,
          bio: form.bio || undefined,
          ownerName: ownerName || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zipCode: form.zipCode || undefined,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update pet");
        setSaving(false);
        return;
      }
      trackPostHogEvent("pet_edited", { pet_id: petId, pet_type: petType });
      setSuccess("Pet updated successfully!");
      setSaving(false);
      setTimeout(() => router.push(`/pets/${petId}`), 1200);
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }

  const stateEntries = Object.entries(US_STATES).sort((a, b) => a[1].localeCompare(b[1]));

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-surface-500 mb-4">You need to log in to edit a pet.</p>
        <Link href={`/auth/signin?callbackUrl=/pets/${petId}/edit`} className="btn-primary">Log in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-surface-500 mt-4">Loading pet...</p>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">{fatalError}</p>
        <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <Link href={`/pets/${petId}`} className="inline-flex items-center gap-2 text-brand-600 font-medium mb-6 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to {form.name || "pet"}
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mb-1">Edit {form.name}</h1>
      <p className="text-sm text-surface-500 mb-6">Update your pet&apos;s info and photos.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Pet name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={60} className="input-field" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Pet type</label>
          <div className="py-2.5 px-4 rounded-xl bg-surface-100 text-sm font-medium text-surface-500">
            {petType === "DOG" ? "🐶 Dog" : petType === "CAT" ? "🐱 Cat" : "🐾 Other"}
            <span className="text-xs text-surface-400 ml-2">(cannot be changed)</span>
          </div>
        </div>

        {petType !== "OTHER" && (
          <div className="relative" ref={breedDropdownRef}>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Breed</label>
            <div className="relative">
              <input
                type="text"
                value={breedDropdownOpen ? breedSearch : form.breed}
                onClick={() => { setBreedDropdownOpen((open) => { const nextOpen = !open; if (nextOpen) setBreedSearch(form.breed); return nextOpen; }); }}
                onChange={(e) => { setBreedSearch(e.target.value); if (!breedDropdownOpen) setBreedDropdownOpen(true); }}
                placeholder={`Search ${petType === "DOG" ? "dog" : "cat"} breeds...`}
                className="input-field pr-10"
                autoComplete="off"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {breedDropdownOpen && (
              <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-surface-200 rounded-xl shadow-lg py-1">
                {filteredBreeds.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-surface-400">No breeds found</li>
                ) : (
                  filteredBreeds.map((b) => (
                    <li key={b.id}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setForm((f) => ({ ...f, breed: b.name })); setBreedSearch(b.name); closeBreedDropdown(); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-50 transition-colors ${form.breed === b.name ? "bg-brand-50 text-brand-700 font-medium" : "text-surface-700"}`}>
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
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={255} rows={3} placeholder="Tell us about your pet..." className="input-field resize-none" />
          <p className="text-xs text-surface-400 mt-1 text-right">{form.bio.length}/255</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Photos * <span className="text-surface-400 font-normal">({photos.length}/5)</span></label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-100 group">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover object-center" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:opacity-100">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded">Main</span>}
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

        <div className="border-t border-surface-100 pt-5"><p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-4">Owner Information</p></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">First name</label><input type="text" value={form.ownerFirstName} onChange={(e) => setForm((f) => ({ ...f, ownerFirstName: e.target.value }))} placeholder="First name" className="input-field" autoComplete="given-name" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Last name</label><input type="text" value={form.ownerLastName} onChange={(e) => setForm((f) => ({ ...f, ownerLastName: e.target.value }))} placeholder="Last name" className="input-field" autoComplete="family-name" /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">City</label><input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="input-field" autoComplete="address-level2" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">State</label><select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="input-field" autoComplete="address-level1"><option value="">Select state</option>{stateEntries.map(([abbr, name]) => (<option key={abbr} value={abbr}>{name}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">ZIP code</label><input type="text" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="ZIP" maxLength={10} className="input-field" autoComplete="postal-code" /></div>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {success && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{success}</div>}

        <div className="flex gap-3">
          <Link href={`/pets/${petId}`} className="flex-1 text-center py-3 rounded-xl text-sm font-semibold bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors">Cancel</Link>
          <button type="submit" disabled={saving || uploading} className="flex-1 btn-primary py-3 text-base disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}
