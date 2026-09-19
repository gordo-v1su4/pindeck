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
import type * as colorExtraction from "../colorExtraction.js";
import type * as colorExtractionAdmin from "../colorExtractionAdmin.js";
import type * as colorExtractionUrls from "../colorExtractionUrls.js";
import type * as colorExtractionWrite from "../colorExtractionWrite.js";
import type * as debug from "../debug.js";
import type * as decks from "../decks.js";
import type * as discordNotifications from "../discordNotifications.js";
import type * as generations from "../generations.js";
import type * as http from "../http.js";
import type * as images_analysis from "../images/analysis.js";
import type * as images_generation from "../images/generation.js";
import type * as images_index from "../images/index.js";
import type * as images_ingest from "../images/ingest.js";
import type * as images_library from "../images/library.js";
import type * as images_lifecycle from "../images/lifecycle.js";
import type * as images_moderation from "../images/moderation.js";
import type * as images_shared from "../images/shared.js";
import type * as images_uploads from "../images/uploads.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_generationSource from "../lib/generationSource.js";
import type * as lib_variationAccess from "../lib/variationAccess.js";
import type * as maintenance from "../maintenance.js";
import type * as mediaAdapter from "../mediaAdapter.js";
import type * as mediaStorage from "../mediaStorage.js";
import type * as orchestration from "../orchestration.js";
import type * as orchestrationCore from "../orchestrationCore.js";
import type * as orchestrationSeam from "../orchestrationSeam.js";
import type * as orchestrationState from "../orchestrationState.js";
import type * as seed from "../seed.js";
import type * as storyboards from "../storyboards.js";
import type * as triggerDispatch from "../triggerDispatch.js";
import type * as vision from "../vision.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  boards: typeof boards;
  colorExtraction: typeof colorExtraction;
  colorExtractionAdmin: typeof colorExtractionAdmin;
  colorExtractionUrls: typeof colorExtractionUrls;
  colorExtractionWrite: typeof colorExtractionWrite;
  debug: typeof debug;
  decks: typeof decks;
  discordNotifications: typeof discordNotifications;
  generations: typeof generations;
  http: typeof http;
  "images/analysis": typeof images_analysis;
  "images/generation": typeof images_generation;
  "images/index": typeof images_index;
  "images/ingest": typeof images_ingest;
  "images/library": typeof images_library;
  "images/lifecycle": typeof images_lifecycle;
  "images/moderation": typeof images_moderation;
  "images/shared": typeof images_shared;
  "images/uploads": typeof images_uploads;
  "lib/authz": typeof lib_authz;
  "lib/generationSource": typeof lib_generationSource;
  "lib/variationAccess": typeof lib_variationAccess;
  maintenance: typeof maintenance;
  mediaAdapter: typeof mediaAdapter;
  mediaStorage: typeof mediaStorage;
  orchestration: typeof orchestration;
  orchestrationCore: typeof orchestrationCore;
  orchestrationSeam: typeof orchestrationSeam;
  orchestrationState: typeof orchestrationState;
  seed: typeof seed;
  storyboards: typeof storyboards;
  triggerDispatch: typeof triggerDispatch;
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
