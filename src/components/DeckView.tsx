import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Box, Card, Flex, Text, Button, Badge } from "@radix-ui/themes";
import type { Id } from "../../convex/_generated/dataModel";
import { DeckComposer } from "./deck/DeckComposer";

export function DeckView({
  selectedDeckId,
  onSelectDeck,
}: {
  selectedDeckId: Id<"decks"> | null;
  onSelectDeck: (deckId: Id<"decks"> | null) => void;
}) {
  const decks = useQuery(api.decks.list);

  useEffect(() => {
    if (!selectedDeckId && decks && decks.length > 0) {
      onSelectDeck(decks[0]._id);
    }
  }, [selectedDeckId, decks, onSelectDeck]);

  const activeDeckId = selectedDeckId ?? (decks && decks.length > 0 ? decks[0]._id : null);
  const deck = useQuery(api.decks.getById, activeDeckId ? { deckId: activeDeckId } : "skip");

  if (decks === undefined) {
    return (
      <Box className="flex justify-center items-center min-h-[50vh]">
        <Text color="gray">Loading decks...</Text>
      </Box>
    );
  }

  if (decks.length === 0) {
    return (
      <Box className="space-y-4 w-full">
        <Text size="7" weight="bold" className="block">Deck</Text>
        <Card className="p-8 text-center bg-gray-900/20 border border-gray-700">
          <Text size="4" color="gray" className="block mb-2">No decks yet</Text>
          <Text size="2" color="gray" className="block">
            Go to Boards and click "Convert to Deck" after selecting images.
          </Text>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="space-y-4 w-full">
      <Flex justify="between" align="center" className="flex-col sm:flex-row gap-3">
        <Box>
          <Text size="7" weight="bold" className="block">Deck</Text>
          <Text size="2" color="gray" className="block mt-1">
            Decks generated from board selections.
          </Text>
        </Box>
        <Badge variant="soft" color="blue" size="2">
          {decks.length} deck{decks.length === 1 ? "" : "s"}
        </Badge>
      </Flex>

      <Box className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3 bg-gray-900/20 border border-gray-700">
          <Text size="2" weight="medium" className="block mb-2">My Decks</Text>
          <Flex direction="column" gap="2" className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {decks.map((item) => {
              const active = item._id === activeDeckId;
              return (
                <Button
                  key={item._id}
                  variant={active ? "solid" : "soft"}
                  color={active ? "blue" : "gray"}
                  size="2"
                  className="justify-start"
                  onClick={() => onSelectDeck(item._id)}
                >
                  <Flex direction="column" align="start" gap="1">
                    <Text size="2" weight="medium" className="leading-tight">{item.title}</Text>
                    <Text size="1" color="gray">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Button>
              );
            })}
          </Flex>
        </Card>

        {deck === undefined ? (
          <Card className="p-8 text-center bg-gray-900/20 border border-gray-700">
            <Text color="gray">Loading selected deck...</Text>
          </Card>
        ) : deck ? (
          <DeckComposer deck={deck} />
        ) : (
          <Card className="p-8 text-center bg-gray-900/20 border border-gray-700">
            <Text color="gray">Deck not found or inaccessible.</Text>
          </Card>
        )}
      </Box>
    </Box>
  );
}
