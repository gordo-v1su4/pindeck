import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  MODAL_CONTENT_CLASS,
  MODAL_DESCRIPTION_CLASS,
  MODAL_TITLE_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TEXTAREA_CLASS,
  SELECT_CLASS,
} from "@/components/ui/actionStyles";
import {
  compactImageTagClass,
  getPaletteTagStyle,
} from "../lib/utils";

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
      <DialogContent className={`${MODAL_CONTENT_CLASS} w-[min(94vw,32rem)] max-w-[32rem] p-0 text-zinc-200`}>
        <div className="border-b border-white/8 px-4 py-2.5">
          <DialogTitle className={MODAL_TITLE_CLASS}>
            Edit Image
          </DialogTitle>
          <DialogDescription className={MODAL_DESCRIPTION_CLASS}>
            Update metadata, tags, and other information.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2.5 px-4 py-3">
            <div>
              <label className={FIELD_LABEL_CLASS}>
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Image title"
                required
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={FIELD_LABEL_CLASS}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Image description"
                rows={2}
                className={`min-h-[52px] w-full px-2 py-1.5 text-[12px] leading-[16px] ${TEXTAREA_CLASS}`}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={FIELD_LABEL_CLASS}>Type</label>
                <select
                  value={group || "none"}
                  onChange={(e) => setGroup(e.target.value === "none" ? "" : e.target.value)}
                  className={SELECT_CLASS}
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
                <label className={FIELD_LABEL_CLASS}>Genre</label>
                <select
                  value={category || "none"}
                  onChange={(e) => setCategory(e.target.value === "none" ? "" : e.target.value)}
                  className={SELECT_CLASS}
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
              <label className={FIELD_LABEL_CLASS}>
                Tags
              </label>
              {tags.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                  {tags.map((tag, index) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`${compactImageTagClass} cursor-pointer border-0`}
                      style={getPaletteTagStyle(image.colors, index, tags.length)}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <span className="ml-1 text-current/70">x</span>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-stretch gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag and press Enter"
                  className={`flex-1 ${FIELD_CLASS}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className={`h-7 px-2.5 text-[11px] ${SECONDARY_BUTTON_CLASS}`}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Source URL
                </label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="https://..."
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  SREF
                </label>
                <Input
                  value={sref}
                  onChange={(e) => setSref(e.target.value)}
                  placeholder="SREF"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Project Name
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  Moodboard Name
                </label>
                <Input
                  value={moodboardName}
                  onChange={(e) => setMoodboardName(e.target.value)}
                  placeholder="Moodboard name"
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/8 px-4 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className={`h-7 px-2.5 text-[11px] ${SECONDARY_BUTTON_CLASS}`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !title.trim()}
              className={`h-7 px-2.5 text-[11px] ${PRIMARY_BUTTON_CLASS}`}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
