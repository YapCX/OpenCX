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
import type * as aml from "../aml.js";
import type * as auth from "../auth.js";
import type * as currencies from "../currencies.js";
import type * as currencyData from "../currencyData.js";
import type * as customers from "../customers.js";
import type * as denominations from "../denominations.js";
import type * as http from "../http.js";
import type * as idTypes from "../idTypes.js";
import type * as initialization from "../initialization.js";
import type * as router from "../router.js";
import type * as settings from "../settings.js";
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
  aml: typeof aml;
  auth: typeof auth;
  currencies: typeof currencies;
  currencyData: typeof currencyData;
  customers: typeof customers;
  denominations: typeof denominations;
  http: typeof http;
  idTypes: typeof idTypes;
  initialization: typeof initialization;
  router: typeof router;
  settings: typeof settings;
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
