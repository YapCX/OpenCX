/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as currencies from "../currencies.js";
import type * as customers from "../customers.js";
import type * as denominations from "../denominations.js";
import type * as files from "../files.js";
import type * as idTypes from "../idTypes.js";
import type * as settings from "../settings.js";
import type * as tillTransactions from "../tillTransactions.js";
import type * as tills from "../tills.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  currencies: typeof currencies;
  customers: typeof customers;
  denominations: typeof denominations;
  files: typeof files;
  idTypes: typeof idTypes;
  settings: typeof settings;
  tillTransactions: typeof tillTransactions;
  tills: typeof tills;
  transactions: typeof transactions;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
