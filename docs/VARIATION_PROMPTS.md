# Variation Prompts Sent to Nano Banana Pro

This doc lists the **exact prompt strings** sent to the fal.ai Nano Banana Pro edit API when you use Generate Variations. One prompt is sent per image; the model gets `prompt` + your image URL(s).

**You get one image per variation** – not storyboards or grids. Each variation is a single frame of that kind (e.g. one subtle-scene moment, one style-variation scene). The reference grids were only to illustrate what "subtle" vs "style" means; the app returns separate images, one per option.

Prompts are designed so **each category asks for a clearly different kind of image** – shot (camera/angle), action (narrative moment), style (different scene/outfit, same person), subtle (later in same scene), b-roll (environment, no people), coverage (detail/object in same world).

---

## How it works

- **Menu "Type"** selects a **mode** (shot-variation, b-roll, action-shot, style-variation, subtle-variation, coverage).
- **Detail (optional)** is your custom text. If you leave it blank:
  - **Shot variation**: we pick one random shot type from the list below for each image (each variation gets a different shot).
  - **All other modes**: the same prompt is sent for every image in the batch (so outputs can look similar unless you use Detail).
- **Context (optional)**: If the image has a **Type** (group) like "Music Video" or "Commercial", we prepend a short phrase for shot-variation and action-shot (e.g. "Later in the music video. ", "Later in the commercial. ").

---

## Examples in practice

**Subtle scene variation (same scene, different beat):**  
Same person, same outfit, same location – different moment or action. E.g. a 3×3 grid at a gas station at night: same person in a black hoodie, same environment; panels show different angles (close-up, medium, wide, from behind, profile) and different actions (leaning on car, sitting on hood, on phone, walking to store, hand with cigarette). All one continuous scene. Or: performer on stage in gold jumpsuit → same person backstage wiping brow, same outfit and event – "later in the same scene."

**Different scene variation – style (same person, different scene/outfit):**  
Same face and likeness, different outfit, different location, different time or story beat. E.g. a 3×3 grid of the same woman: gold jumpsuit on stage vs. trench coat in office at night vs. grey t-shirt in bedroom in the morning vs. trench coat on rainy neon street vs. olive jacket after a struggle vs. light brown coat on rooftop at sunset. Each is a different "chapter" – different clothes, different setting, same person.

Use **Subtle variation** when you want "later in that scene" – same story, different beat (different angle, action, or moment within the same event). Use **Style variation** when you want the same character in a different scene – different outfit and location, same face.

---

## 1. Shot variation

**What we ask:** Same person, different camera angle or framing; "later in the scene" so it feels like a different moment, not the same pose. Shot type is the main instruction (close-up, from behind, bird's eye, profile, etc.).

**When you leave Detail blank:**  
Each image gets one of these shot types at random. The prompt is:  
`Later in the scene. {shot type} of the same subject.`  
(If group is "Music Video" we send: `Later in the music video. Later in the scene. {shot type} of the same subject.`)

| # | Shot type (from code) | Exact prompt sent |
|---|------------------------|-------------------|
| 1 | close-up | Later in the scene. close-up of the same subject. |
| 2 | extreme close-up | Later in the scene. extreme close-up of the same subject. |
| 3 | close-up profile | Later in the scene. close-up profile of the same subject. |
| 4 | medium close-up | Later in the scene. medium close-up of the same subject. |
| 5 | macro of the hands | Later in the scene. macro of the hands of the same subject. |
| 6 | profile | Later in the scene. profile of the same subject. |
| 7 | from behind | Later in the scene. from behind of the same subject. |
| 8 | over-the-shoulder | Later in the scene. over-the-shoulder of the same subject. |
| 9 | medium shot | Later in the scene. medium shot of the same subject. |
| 10 | wide shot | Later in the scene. wide shot of the same subject. |
| 11 | extreme wide shot | Later in the scene. extreme wide shot of the same subject. |
| 12 | low angle shot | Later in the scene. low angle shot of the same subject. |
| 13 | high angle shot | Later in the scene. high angle shot of the same subject. |
| 14 | bird's eye view | Later in the scene. bird's eye view of the same subject. |
| 15 | dutch angle | Later in the scene. dutch angle of the same subject. |
| 16 | point of view shot | Later in the scene. point of view shot of the same subject. |

**When you fill in Detail (e.g. "macro of the hands"):**  
`Later in the scene. macro of the hands of the same subject.`

**Three examples of what this category is for:**
1. Close-up profile of the same person.
2. Bird's eye view of the same subject.
3. Later in the video, over-the-shoulder shot of the same subject.

---

## 2. B-Roll

**What we ask:** Same location/environment, no people – establishing shots, exteriors, empty space.

**No Detail:**  
`Establishing shot of the environment. No people. Same location and lighting.`  
(Same prompt for every image in the batch.)

**With Detail (e.g. "exterior of the building"):**  
`exterior of the building. Same location/environment. No people visible.`

**Three examples of what this category is for:**
1. Exterior of the building, no people.
2. Establishing shot of the street, same location.
3. Same location, empty environment.

---

## 3. Action shot

**What we ask:** A narrative moment – climax, performing shot, plot twist – same person. Not generic motion blur; we give the model room to interpret "dramatic action" or "performing moment."

**No Detail:**  
`Dramatic action or performing moment. Same person.`  
(If group is "Commercial" we send: `Later in the commercial. Dramatic action or performing moment. Same person.`)

**With Detail (e.g. "mid-jump"):**  
`mid-jump. Same person.`

**Three examples of what this category is for:**
1. The climax of the commercial, same person.
2. Peak performing moment, same subject.
3. Plot twist moment, same person.

---

## 4. Style variation

**What we ask:** Same person (same face and likeness), different scene – different outfit, location, time of day or sequence. E.g. school outfit in class one shot, then same person at a party in different clothes and setting.

**No Detail:**  
`Same person, different scene. Different outfit, different location, same face and likeness.`

**With Detail (e.g. "a party"):**  
`Same person at a party. Different outfit and location, same face.`

**Three examples of what this category is for:**
1. Same person at a party, different outfit and location.
2. Same character, next day, different clothes and setting.
3. Same face, different scene and wardrobe.

---

## 5. Subtle variation

**What we ask:** Later in the **same** scene – same story, different beat. E.g. in the bedroom, in the back of the car, getting dropped off – same person and setting, different action or position.

**No Detail:**  
`Later in the same scene. Same story, different moment – same person, different action or position.`

**With Detail (e.g. "in the bedroom"):**  
`Later in the scene: in the bedroom. Same person and setting.`

**Three examples of what this category is for:**
1. Later in the scene, in the bedroom – same person and setting.
2. Same scene, back of the car – same person, different position.
3. A few moments later, same location, different action.

---

## 6. Coverage

**What we ask:** Detail or object shots in the same world – things that could mean something (e.g. necklace on the table, photo on the wall, shoes by the door). Same environment, no people.

**No Detail:**  
`Show something else in the same environment. A detail or object that could mean something – no people. Same world as the image.`

**With Detail (e.g. "her necklace on the table"):**  
`her necklace on the table. Same environment, no people.`

**Three examples of what this category is for:**
1. Her necklace on the table, same environment.
2. The photo on the wall, same world.
3. Shoes by the door, same environment, no people.

---

## Where this lives in code

- **Shot types list:** [convex/vision.ts](convex/vision.ts) → `SHOT_TYPES`
- **Mode templates:** [convex/vision.ts](convex/vision.ts) → `MODE_PROMPTS`
- **Building the prompt and calling fal:** [convex/vision.ts](convex/vision.ts) → `internalGenerateRelatedImages` (uses `MODE_PROMPTS[mode](detail)`, optionally prepends context from `group`, and sends as `prompt` to `fal.subscribe("fal-ai/nano-banana-pro/edit", { input: { prompt, image_urls: [...] } })`).
- **Preview query:** [convex/vision.ts](convex/vision.ts) → `getVariationPrompts` (returns the prompts that would be sent for given mode, count, and detail; does not include group context).
