import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, Heart, Eye, ExternalLink } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";

interface ImageModalProps {
  imageId: Id<"images">;
  onClose: () => void;
}

export function ImageModal({ imageId, onClose }: ImageModalProps) {
  const image = useQuery(api.images.getById, { id: imageId });
  const toggleLike = useMutation(api.images.toggleLike);
  const incrementViews = useMutation(api.images.incrementViews);

  useEffect(() => {
    if (imageId) {
      incrementViews({ imageId });
    }
  }, [imageId, incrementViews]);

  const handleLike = async () => {
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-4xl max-h-[90vh] w-full bg-zinc-900 rounded-lg overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col lg:flex-row max-h-[90vh]">
          <div className="flex-1 flex items-center justify-center bg-black">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="w-full lg:w-80 p-6 space-y-4 overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">
                {image.title}
              </h2>
              {image.description && (
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {image.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-zinc-400 text-sm">
              <div className="flex items-center gap-1">
                <Heart size={16} />
                <span>{image.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye size={16} />
                <span>{image.views}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-zinc-400 text-sm">Category:</span>
                <span className="ml-2 px-2 py-1 bg-zinc-800 rounded text-zinc-200 text-sm capitalize">
                  {image.category}
                </span>
              </div>

              {image.tags.length > 0 && (
                <div>
                  <span className="text-zinc-400 text-sm block mb-2">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {image.source && (
                <div>
                  <span className="text-zinc-400 text-sm">Source:</span>
                  <a
                    href={image.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-zinc-300 hover:text-zinc-100 text-sm inline-flex items-center gap-1"
                  >
                    View Original
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleLike}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  image.isLiked
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                <Heart 
                  size={18} 
                  fill={image.isLiked ? "currentColor" : "none"}
                />
                {image.isLiked ? 'Liked' : 'Like'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
