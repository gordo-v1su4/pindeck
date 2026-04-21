import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const withAlpha = (hex: string, alpha: string) =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;

const fieldClassName =
  "h-9 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/32 focus-visible:border-[#2f7dd1] focus-visible:ring-2 focus-visible:ring-[#2f7dd1]/20";

const selectClassName =
  "h-9 w-full rounded-[8px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-[#2f7dd1] focus:ring-2 focus:ring-[#2f7dd1]/20";

const labelClassName =
  "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/52";

const panelClassName =
  "rounded-[16px] border border-white/8 bg-white/[0.02] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";

const sectionTitleClassName =
  "text-[12px] font-semibold uppercase tracking-[0.16em] text-white/44";

interface EditImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: Id<"images">;
}

export function EditImageModal({ open, onOpenChange, imageId }: EditImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const categories = useQuery(api.images.getCategories);
  const groups = useQuery(api.images.getGroups);
  const updateImageMetadata = useMutation(api.images.updateImageMetadata);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [group, setGroup] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [sref, setSref] = useState("");
  const [projectName, setProjectName] = useState("");
  const [moodboardName, setMoodboardName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const modalTagPalette = image?.colors?.length ? image.colors : ["#4b5563"];
  const previewUrl = image?.previewUrl || image?.imageUrl;

  // Load image data when modal opens
  useEffect(() => {
    if (open && image) {
      setTitle(image.title || "");
      setDescription(image.description || "");
      setTags(image.tags || []);
      setGroup(image.group || "");
      setCategory(image.category || "");
      setSource(image.source || "");
      setSref(image.sref || "");
      setProjectName(image.projectName || "");
      setMoodboardName(image.moodboardName || "");
      setTagInput("");
    }
  }, [open, image]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setTagInput("");
    }
  }, [open]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateImageMetadata({
        imageId,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        group: group || undefined,
        category: category || undefined,
        source: source.trim() || undefined,
        sref: sref.trim() || undefined,
        projectName: projectName.trim() || undefined,
        moodboardName: moodboardName.trim() || undefined,
      });
      toast.success("Image updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update image:", error);
      toast.error(error.message || "Failed to update image");
    } finally {
      setSubmitting(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,58rem)] max-w-[58rem] max-h-[90vh] overflow-y-auto border-white/10 bg-neutral-950/92 p-0 text-white supports-backdrop-filter:backdrop-blur-xl">
        <div className="border-b border-white/8 px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <DialogTitle className="text-[28px] font-semibold tracking-[-0.03em] text-white">
                Edit Image
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-[34rem] text-sm leading-6 text-white/58">
                Update image metadata, tags, and project details without losing the original visual context.
              </DialogDescription>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/46 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
              Metadata Editor
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
            <div className="space-y-5">
              <section className={panelClassName}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className={sectionTitleClassName}>Core Details</h3>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/32">
                    Required fields first
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClassName}>
                      Title *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Image title"
                      required
                      className={fieldClassName}
                    />
                  </div>

                  <div>
                    <label className={labelClassName}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Image description"
                      rows={5}
                      className="min-h-[132px] w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/32 focus:border-[#2f7dd1] focus:ring-2 focus:ring-[#2f7dd1]/20"
                    />
                  </div>
                </div>
              </section>

              <section className={panelClassName}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className={sectionTitleClassName}>Tags</h3>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/32">
                    Click a tag to remove
                  </div>
                </div>

                <div className="mb-3 flex min-h-10 gap-1.5 flex-wrap">
                  {tags.map((tag, index) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="h-6 cursor-pointer rounded-[6px] border px-2 text-[11px] font-medium"
                      style={{
                        backgroundColor: withAlpha(modalTagPalette[index % modalTagPalette.length], "18"),
                        borderColor: withAlpha(modalTagPalette[index % modalTagPalette.length], "34"),
                        color: modalTagPalette[index % modalTagPalette.length],
                      }}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <span className="ml-1 text-current/70">x</span>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag and press Enter"
                    className={`flex-1 ${fieldClassName}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="border-white/10 bg-white/[0.03] text-white/78 hover:bg-white/[0.07] hover:text-white"
                  >
                    Add
                  </Button>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className={panelClassName}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className={sectionTitleClassName}>Preview</h3>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/32">
                    Current palette
                  </div>
                </div>

                <div className="overflow-hidden rounded-[12px] border border-white/8 bg-black/20">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={title || image.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-white/38">
                      No preview available
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {modalTagPalette.slice(0, 5).map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor: color,
                        borderColor: withAlpha(color, "66"),
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </section>

              <section className={panelClassName}>
                <h3 className={`mb-4 ${sectionTitleClassName}`}>Classification</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <label className={labelClassName}>Type</label>
                    <select
                      value={group || "none"}
                      onChange={(e) => setGroup(e.target.value === "none" ? "" : e.target.value)}
                      className={selectClassName}
                    >
                      <option value="none">None</option>
                      {(groups || []).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClassName}>Genre</label>
                    <select
                      value={category || "none"}
                      onChange={(e) => setCategory(e.target.value === "none" ? "" : e.target.value)}
                      className={selectClassName}
                    >
                      <option value="none">None</option>
                      {(categories || []).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className={panelClassName}>
                <h3 className={`mb-4 ${sectionTitleClassName}`}>Source & Naming</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <label className={labelClassName}>
                        Source URL
                      </label>
                      <Input
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="https://..."
                        className={fieldClassName}
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>
                        SREF
                      </label>
                      <Input
                        value={sref}
                        onChange={(e) => setSref(e.target.value)}
                        placeholder="Style reference"
                        className={fieldClassName}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <label className={labelClassName}>
                        Project Name
                      </label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Project name"
                        className={fieldClassName}
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>
                        Moodboard Name
                      </label>
                      <Input
                        value={moodboardName}
                        onChange={(e) => setMoodboardName(e.target.value)}
                        placeholder="Moodboard name"
                        className={fieldClassName}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/8 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.07] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !title.trim()}
              className="bg-[#2f7dd1] text-white hover:bg-[#3c8ae0]"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
