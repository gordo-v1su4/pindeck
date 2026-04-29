import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { UploadIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PinIcon } from "@/components/ui/pindeck";

/** Shared field chrome — matches [`ImageDetailDrawer`](src/components/pd/ImageDetailDrawer.tsx) inputs. */
const fieldShell: React.CSSProperties = {
  width: "100%",
  height: 32,
  padding: "0 10px",
  background: "rgba(255,255,255,0.025)",
  color: "var(--pd-ink)",
  border: "1px solid var(--pd-line-strong)",
  borderRadius: 4,
  fontSize: 12,
  outline: "none",
};

const labelUpper: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.06em",
  color: "var(--pd-ink-faint)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
  fontFamily: 'var(--pd-font-mono, ui-monospace, monospace)',
};

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId?: Id<"images">;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
  allowUpload?: boolean;
}

export function CreateBoardModal({ open, onOpenChange, imageId, setActiveTab, incrementBoardVersion, allowUpload = false }: CreateBoardModalProps) {
  const createBoard = useMutation(api.boards.create);
  const addImageToBoard = useMutation(api.boards.addImage);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadMultiple = useMutation(api.images.uploadMultiple);

  /** Maps to Convex `boards.create`: name (required), description?, isPublic? — see convex/boards.ts */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsPublic(false);
      setSubmitting(false);
      setSelectedFiles([]);
      setUploadProgress("");
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;

    setSubmitting(true);
    try {
      const boardId = await createBoard({
        name: n,
        description: description.trim() || undefined,
        isPublic,
      });

      if (imageId) {
        try {
          await addImageToBoard({ boardId, imageId });
          toast.success(`Board "${n}" created and image saved!`);
        } catch (addError: unknown) {
          const msg = addError instanceof Error ? addError.message : "";
          if (msg.includes("already in board")) {
            toast.success(`Board "${n}" created!`);
          } else {
            toast.success(`Board "${n}" created, but failed to add image`);
          }
        }
      } else if (selectedFiles.length > 0) {
        setUploadProgress(`Uploading 0/${selectedFiles.length}...`);

        const uploadPayload: Array<Record<string, unknown>> = [];
        let stagedCount = 0;
        for (const file of selectedFiles) {
          try {
            const uploadUrl = await generateUploadUrl();
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });
            if (!response.ok) throw new Error("Upload failed");

            const { storageId } = await response.json();
            const title = file.name.replace(/\.[^/.]+$/, "");
            uploadPayload.push({
              storageId,
              originalFileName: file.name,
              title,
              description: undefined,
              tags: [],
              category: "General",
              source: "Board Upload",
              sref: undefined,
              colors: undefined,
              group: undefined,
              projectName: title,
              moodboardName: undefined,
              uniqueId: undefined,
              variationCount: 0,
            });
            stagedCount++;
            setUploadProgress(`Uploading ${stagedCount}/${selectedFiles.length}...`);
          } catch (uploadError) {
            console.error("Failed to upload file:", file.name, uploadError);
          }
        }

        const imageIds =
          uploadPayload.length > 0 ? await uploadMultiple({ uploads: uploadPayload as any }) : [];

        let uploadedCount = 0;
        for (const newImageId of imageIds) {
          try {
            await addImageToBoard({ boardId, imageId: newImageId });
            uploadedCount++;
          } catch (addError) {
            console.error("Failed to add uploaded image to board", addError);
          }
        }

        toast.success(`Board "${n}" created with ${uploadedCount} images!`);
      } else {
        toast.success("Board created successfully!");
      }

      setName("");
      setDescription("");
      setIsPublic(false);
      setSelectedFiles([]);
      setUploadProgress("");
      onOpenChange(false);
      setActiveTab("boards");
      incrementBoardVersion();
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "overflow-hidden !gap-0 !rounded-[var(--pd-radius-sm,6px)] !p-0 !shadow-[var(--pd-shadow-deep)] sm:!max-w-[min(36rem,95vw)]",
          "!flex !max-h-[min(88vh,900px)] !w-[min(95vw,36rem)] !max-w-[36rem] !flex-col !border",
        )}
        style={{
          borderColor: "var(--pd-line-strong)",
          background: "var(--pd-glass-bg)",
          color: "var(--pd-ink)",
        }}
      >
        <div className="pd-theme" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <header
            style={{
              flexShrink: 0,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "14px 16px 12px",
              borderBottom: "1px solid var(--pd-line)",
              background: "var(--pd-glass-header)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle
                className="font-semibold tracking-tight"
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--pd-ink)",
                  lineHeight: 1.35,
                  fontFamily: "var(--pd-font-sans, inherit)",
                }}
              >
                Create New Board
              </DialogTitle>
              <DialogDescription style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--pd-ink-mute)" }}>
                Create a new board to organize your favorite images.
              </DialogDescription>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                border: "1px solid var(--pd-line)",
                background: "transparent",
                color: "var(--pd-ink-dim)",
                cursor: "pointer",
              }}
            >
              <PinIcon name="close" size={12} />
            </button>
          </header>

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="pd-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label htmlFor="create-board-name" className="pd-mono" style={labelUpper}>
                    Board Name <span style={{ color: "var(--pd-red)" }}>*</span>
                  </label>
                  <input
                    id="create-board-name"
                    name="boardName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Inspiration Board"
                    autoComplete="off"
                    style={fieldShell}
                  />
                </div>

                <div>
                  <label htmlFor="create-board-desc" className="pd-mono" style={labelUpper}>
                    Description
                  </label>
                  <textarea
                    id="create-board-desc"
                    name="boardDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description…"
                    rows={3}
                    style={{
                      ...fieldShell,
                      height: "auto",
                      minHeight: 72,
                      paddingTop: 8,
                      paddingBottom: 8,
                      resize: "vertical",
                    }}
                  />
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    style={{
                      width: 16,
                      height: 16,
                      marginTop: 2,
                      flexShrink: 0,
                      cursor: "pointer",
                      accentColor: "var(--pd-accent)",
                    }}
                  />
                  <span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--pd-ink)" }}>
                      Make this board public
                    </span>
                    <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--pd-ink-faint)", lineHeight: 1.4 }}>
                      Visible to others when shared; you can change this later.
                    </span>
                  </span>
                </label>

                {allowUpload && !imageId && (
                  <div>
                    <span className="pd-mono" style={labelUpper}>
                      Add Images (optional)
                    </span>
                    <button
                      type="button"
                      style={{
                        width: "100%",
                        cursor: "pointer",
                        borderRadius: 6,
                        border: "2px dashed var(--pd-line-strong)",
                        padding: 16,
                        textAlign: "center",
                        background: "transparent",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <UploadIcon width={22} height={22} style={{ margin: "0 auto 8px", display: "block", color: "var(--pd-ink-mute)" }} />
                      <span style={{ fontSize: 12, color: "var(--pd-ink-mute)" }}>Click to select images</span>
                    </button>

                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {selectedFiles.map((file, index) => (
                            <span
                              key={`${file.name}-${index}`}
                              className="pd-mono"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 10,
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: "1px solid var(--pd-line)",
                                background: "var(--pd-bg-2)",
                                maxWidth: "100%",
                              }}
                            >
                              <span className="truncate" style={{ maxWidth: 140 }}>{file.name}</span>
                              <Cross2Icon
                                width={14}
                                height={14}
                                style={{ cursor: "pointer", flexShrink: 0, color: "var(--pd-ink-dim)" }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                              />
                            </span>
                          ))}
                        </div>
                        <span style={{ display: "block", marginTop: 8, fontSize: 10, color: "var(--pd-ink-faint)" }}>
                          {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                        </span>
                      </div>
                    )}

                    {uploadProgress ? (
                      <span style={{ display: "block", marginTop: 10, fontSize: 12, color: "var(--pd-accent-ink)" }}>{uploadProgress}</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <footer
              style={{
                flexShrink: 0,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                padding: "14px 16px",
                borderTop: "1px solid var(--pd-line)",
                background: "var(--pd-glass-footer)",
              }}
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: "1px solid var(--pd-line-strong)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--pd-ink-dim)",
                  cursor: "pointer",
                  minWidth: "5.75rem",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "none",
                  cursor: submitting || !name.trim() ? "not-allowed" : "pointer",
                  minWidth: "8.75rem",
                  background:
                    submitting || !name.trim() ? "var(--pd-line-strong)" : "var(--pd-accent)",
                  color: "var(--pd-accent-contrast-text, #fff)",
                  opacity: submitting || !name.trim() ? 0.75 : 1,
                }}
              >
                {submitting ? (uploadProgress || "Creating…") : "Create Board"}
              </button>
            </footer>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
