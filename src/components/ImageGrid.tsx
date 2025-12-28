import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ImageModal } from "./ImageModal";
import { HeartFilledIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { Card, IconButton, Text, Flex, Box, Spinner } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ImageGridProps {
  searchTerm: string;
  selectedCategory: string | undefined;
}

export function ImageGrid({ searchTerm, selectedCategory }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Id<"images"> | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ x: number; y: number } | undefined>();
  
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
      toast.error("Failed to update like status. Please try again.");
    }
  };

  if (images === undefined) {
    return (
      <Flex justify="center" align="center" className="min-h-[50vh]">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (images.length === 0) {
    return (
      <Box className="text-center py-16">
        <Text size="4" color="gray">
          {searchTerm ? "No images found for your search." : "No images available."}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {images.map((image) => (
          <Card
            key={image._id}
            className="group cursor-pointer hover:ring-2 hover:ring-gray-8 transition-all duration-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTriggerPosition({
                x: rect.left,
                y: rect.top
              });
              setSelectedImage(image._id);
            }}
          >
            <Box className="relative overflow-hidden aspect-[3/4]">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Overlay */}
              <Box className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Box className="absolute top-2 right-2">
                  <IconButton
                    variant="ghost"
                    color="red"
                    size="2"
                    aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                    onClick={(e) => handleLike(image._id, e)}
                    className="text-white hover:bg-black/20"
                  >
                    <HeartFilledIcon className={image.isLiked ? "text-red-500" : "text-white"} />
                  </IconButton>
                </Box>
                
                <Box className="absolute bottom-0 left-0 right-0 p-3">
                  <Text size="2" weight="medium" className="text-white mb-1 line-clamp-2">
                    {image.title}
                  </Text>
                  <Flex gap="3" align="center" className="text-gray-300">
                    <Flex gap="1" align="center">
                      <HeartFilledIcon width="12" height="12" />
                      <Text size="1">{image.likes}</Text>
                    </Flex>
                    <Flex gap="1" align="center">
                      <EyeOpenIcon width="12" height="12" />
                      <Text size="1">{image.views}</Text>
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            </Box>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <ImageModal
          imageId={selectedImage}
          onClose={() => {
            setSelectedImage(null);
            setTriggerPosition(undefined);
          }}
          triggerPosition={triggerPosition}
        />
      )}
    </>
  );
}
