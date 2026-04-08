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
      <DialogContent className="w-[min(95vw,46rem)] max-w-[46rem] max-h-[88vh] overflow-y-auto border-white/10 bg-neutral-950/92 p-0 text-white supports-backdrop-filter:backdrop-blur-xl">
        <div className="border-b border-white/8 px-6 py-5">
          <DialogTitle className="text-[28px] font-semibold tracking-[-0.03em] text-white">
            Edit Image
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-[32rem] text-sm leading-6 text-white/58">
          Update image metadata, tags, and other information.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
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
                rows={3}
                className="min-h-[88px] w-full rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/32 focus:border-[#2f7dd1] focus:ring-2 focus:ring-[#2f7dd1]/20"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

            <div>
              <label className={labelClassName}>
                Tags
              </label>
              <div className="mb-3 flex gap-1.5 flex-wrap">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="h-6 cursor-pointer rounded-[6px] border px-2 text-[11px] font-medium"
                    style={{
                      backgroundColor: withAlpha(modalTagPalette[tags.indexOf(tag) % modalTagPalette.length], "18"),
                      borderColor: withAlpha(modalTagPalette[tags.indexOf(tag) % modalTagPalette.length], "34"),
                      color: modalTagPalette[tags.indexOf(tag) % modalTagPalette.length],
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                Style Reference (Sref)
                </label>
                <Input
                value={sref}
                onChange={(e) => setSref(e.target.value)}
                placeholder="Style reference"
                className={fieldClassName}
              />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="flex justify-end gap-2 border-t border-white/8 pt-4">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
