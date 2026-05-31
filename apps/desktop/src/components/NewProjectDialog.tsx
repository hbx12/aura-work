import { useState } from "react";
import { Icon } from "@aura-os/ui";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, folderPath: string, instructions: string) => Promise<void>;
  onPickFolder: () => Promise<string | null>;
}

export function NewProjectDialog({ open, onClose, onCreate, onPickFolder }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onCreate(name, folderPath, instructions);
      setName("");
      setFolderPath("");
      setInstructions("");
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const browse = async () => {
    const picked = await onPickFolder();
    if (picked) {
      setFolderPath(picked);
      if (!name.trim()) {
        const parts = picked.replace(/\\/g, "/").split("/");
        setName(parts[parts.length - 1] || "project");
      }
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="new-project-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-project-title">New project</h2>
        <p className="modal-desc">Connect a local folder. Aura keeps files, permissions, and audit on your machine.</p>
        {err && <p className="modal-error">{err}</p>}
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-project" />
        </label>
        <label className="field">
          <span>Folder</span>
          <div className="field-row">
            <input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\dev\my-project"
            />
            <button type="button" className="btn secondary sm" onClick={browse}>
              <Icon name="folder" size={14} />
              Browse
            </button>
          </div>
        </label>
        <label className="field">
          <span>Instructions (optional)</span>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Project-specific guidance for Aura…"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={busy || !name.trim() || !folderPath.trim()}
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}
