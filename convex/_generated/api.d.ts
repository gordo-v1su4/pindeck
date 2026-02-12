/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as boards from "../boards.js";
import type * as debug from "../debug.js";
import type * as decks from "../decks.js";
import type * as discordNotifications from "../discordNotifications.js";
import type * as generations from "../generations.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as integrations from "../integrations.js";
import type * as router from "../router.js";
import type * as seed from "../seed.js";
import type * as storyboards from "../storyboards.js";
import type * as vision from "../vision.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  boards: typeof boards;
  debug: typeof debug;
  decks: typeof decks;
  discordNotifications: typeof discordNotifications;
  generations: typeof generations;
  http: typeof http;
  images: typeof images;
  integrations: typeof integrations;
  router: typeof router;
  seed: typeof seed;
  storyboards: typeof storyboards;
  vision: typeof vision;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
