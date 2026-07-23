'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import type { RequirementRow } from '@/lib/employee-documents';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic';

const inputClass =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand';

interface Props {
  requirement: RequirementRow;
  /** Set when an admin is filing on someone else's behalf. */
  profileId?: string;
  onUploaded: () => Promise<void> | void;
  onClose: () => void;
}

export function UploadModal({ requirement, profileId, onUploaded, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!file) return setError('Choose a file to upload.');
    if (requirement.requiresExpiry && !expiresOn) {
      return setError(`${requirement.name} needs an expiry date.`);
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('requirementId', requirement.id);
    if (issuedOn) fd.append('issuedOn', issuedOn);
    if (expiresOn) fd.append('expiresOn', expiresOn);
    if (profileId) fd.append('profileId', profileId);

    setBusy(true);
    try {
      const res = await fetch('/api/employee-documents/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await onUploaded();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload {requirement.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {requirement.description ?? 'PDF or image, up to 15 MB.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-border hover:border-brand/50 transition-colors"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {file ? file.name : 'Choose a file'}
            </span>
            <span className="text-xs text-muted-foreground">PDF, PNG, JPEG, WEBP or HEIC</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Issued on (optional)
              </label>
              <input
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Expires on{requirement.requiresExpiry ? '' : ' (optional)'}
              </label>
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Uploading replaces any file already on record for this item and sends it back for
            verification.
          </p>
        </DialogBody>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
