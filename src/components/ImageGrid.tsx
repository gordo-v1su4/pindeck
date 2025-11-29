import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ImageModal } from "./ImageModal";
import { HeartIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { Card, IconButton, Text, Flex, Box, Spinner } from "@radix-ui/themes";
import { Id } from "../../convex/_generated/dataModel";

interface ImageGridProps {
  searchTerm: string;
  selectedCategory: string | undefined;
  setActiveTab: (tab: string) => void;
  incrementBoardVersion: () => void;
}

export function ImageGrid({ searchTerm, selectedCategory, setActiveTab, incrementBoardVersion }: ImageGridProps) {
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
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {images.map((image) => (
          <Card
            key={image._id}
            className="break-inside-avoid group cursor-pointer hover:ring-2 hover:ring-gray-8 transition-all duration-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTriggerPosition({
                x: rect.left,
                y: rect.top
              });
              setSelectedImage(image._id);
            }}
          >
            <Box className="relative overflow-hidden">
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              
              {/* Overlay */}
              <Box className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200">
                <Box className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <IconButton
                    variant="soft"
                    color={image.isLiked ? "red" : "gray"}
                    size="2"
                    aria-label={image.isLiked ? "Unlike this image" : "Like this image"}
                    onClick={(e) => { void handleLike(image._id, e); }}
                    className="backdrop-blur-md"
                    style={{ opacity: 0.85 }}
                  >
                    <HeartIcon />
                  </IconButton>
                </Box>
                
                <Box className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Text size="2" weight="medium" className="text-gray-11 mb-1 line-clamp-2">
                    {image.title}
                  </Text>
                  <Flex gap="3" align="center">
                    <Flex gap="1" align="center">
                      <HeartIcon width="12" height="12" className="text-gray-10" />
                      <Text size="1" color="gray">{image.likes}</Text>
                    </Flex>
                    <Flex gap="1" align="center">
                      <EyeOpenIcon width="12" height="12" className="text-gray-10" />
                      <Text size="1" color="gray">{image.views}</Text>
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
          setActiveTab={setActiveTab}
          incrementBoardVersion={incrementBoardVersion}
        />
      )}
    </>
  );
}
