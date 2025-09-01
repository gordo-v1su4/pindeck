import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ImageModal } from "./ImageModal";
import { Heart, Eye } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface ImageGridProps {
  searchTerm: string;
  selectedCategory: string | undefined;
}

export function ImageGrid({ searchTerm, selectedCategory }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  
  const images = useQuery(
    searchTerm 
      ? api.images.search 
      : api.images.list,
    searchTerm 
      ? { searchTerm, category: selectedCategory }
      : { category: selectedCategory }
  );

  const toggleLike = useMutation(api.images.toggleLike);

  const handleLike = async (imageId: Id<"images">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike({ imageId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  if (images === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 text-lg">
          {searchTerm ? "No images found for your search." : "No images available."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {images.map((image) => (
          <div
            key={image._id}
            className="break-inside-avoid group cursor-pointer"
            onClick={() => setSelectedImage(image._id)}
          >
            <div className="relative bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-zinc-700 transition-all duration-200">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => handleLike(image._id, e)}
                    className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                      image.isLiked 
                        ? 'bg-red-500/80 text-white' 
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                  >
                    <Heart 
                      size={16} 
                      fill={image.isLiked ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                    {image.title}
                  </h3>
                  <div className="flex items-center gap-3 text-zinc-300 text-xs">
                    <div className="flex items-center gap-1">
                      <Heart size={12} />
                      <span>{image.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{image.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <ImageModal
          imageId={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}
