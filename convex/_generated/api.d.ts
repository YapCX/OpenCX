/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounting from "../accounting.js";
import type * as accounts from "../accounts.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as branches from "../branches.js";
import type * as compliance from "../compliance.js";
import type * as currencies from "../currencies.js";
import type * as customerBankInfo from "../customerBankInfo.js";
import type * as customerDocuments from "../customerDocuments.js";
import type * as customers from "../customers.js";
import type * as denominations from "../denominations.js";
import type * as exchangeRates from "../exchangeRates.js";
import type * as http from "../http.js";
import type * as lookups from "../lookups.js";
import type * as mainAccounts from "../mainAccounts.js";
import type * as tills from "../tills.js";
import type * as transactions from "../transactions.js";
import type * as treasury from "../treasury.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounting: typeof accounting;
  accounts: typeof accounts;
  audit: typeof audit;
  auth: typeof auth;
  branches: typeof branches;
  compliance: typeof compliance;
  currencies: typeof currencies;
  customerBankInfo: typeof customerBankInfo;
  customerDocuments: typeof customerDocuments;
  customers: typeof customers;
  denominations: typeof denominations;
  exchangeRates: typeof exchangeRates;
  http: typeof http;
  lookups: typeof lookups;
  mainAccounts: typeof mainAccounts;
  tills: typeof tills;
  transactions: typeof transactions;
  treasury: typeof treasury;
  users: typeof users;
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
