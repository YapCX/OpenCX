import { action } from "./_generated/server";
import { v } from "convex/values";

interface CurrencyInfo {
  code: string;
  name: string;
  country: string;
  flag: string;
}

/**
 * Manual currency data for common currencies
 * Since we can't rely on external packages in Convex actions,
 * we'll maintain a curated list of major currencies
 */
function getCurrencyDataMap(): Record<string, CurrencyInfo> {
  return {
    // Major world currencies
    USD: { code: "USD", name: "US Dollar", country: "United States", flag: "🇺🇸" },
    EUR: { code: "EUR", name: "Euro", country: "Germany", flag: "🇪🇺" },
    GBP: { code: "GBP", name: "British Pound", country: "United Kingdom", flag: "🇬🇧" },
    JPY: { code: "JPY", name: "Japanese Yen", country: "Japan", flag: "🇯🇵" },
    CHF: { code: "CHF", name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭" },
    CAD: { code: "CAD", name: "Canadian Dollar", country: "Canada", flag: "🇨🇦" },
    AUD: { code: "AUD", name: "Australian Dollar", country: "Australia", flag: "🇦🇺" },
    CNY: { code: "CNY", name: "Chinese Yuan", country: "China", flag: "🇨🇳" },
    INR: { code: "INR", name: "Indian Rupee", country: "India", flag: "🇮🇳" },
    BRL: { code: "BRL", name: "Brazilian Real", country: "Brazil", flag: "🇧🇷" },
    RUB: { code: "RUB", name: "Russian Ruble", country: "Russia", flag: "🇷🇺" },
    KRW: { code: "KRW", name: "South Korean Won", country: "South Korea", flag: "🇰🇷" },

    // Middle East & Africa
    AED: { code: "AED", name: "UAE Dirham", country: "United Arab Emirates", flag: "🇦🇪" },
    SAR: { code: "SAR", name: "Saudi Riyal", country: "Saudi Arabia", flag: "🇸🇦" },
    ZAR: { code: "ZAR", name: "South African Rand", country: "South Africa", flag: "🇿🇦" },
    EGP: { code: "EGP", name: "Egyptian Pound", country: "Egypt", flag: "🇪🇬" },
    NGN: { code: "NGN", name: "Nigerian Naira", country: "Nigeria", flag: "🇳🇬" },

    // Asia Pacific
    SGD: { code: "SGD", name: "Singapore Dollar", country: "Singapore", flag: "🇸🇬" },
    HKD: { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong", flag: "🇭🇰" },
    THB: { code: "THB", name: "Thai Baht", country: "Thailand", flag: "🇹🇭" },
    MYR: { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia", flag: "🇲🇾" },
    IDR: { code: "IDR", name: "Indonesian Rupiah", country: "Indonesia", flag: "🇮🇩" },
    PHP: { code: "PHP", name: "Philippine Peso", country: "Philippines", flag: "🇵🇭" },
    VND: { code: "VND", name: "Vietnamese Dong", country: "Vietnam", flag: "🇻🇳" },

    // Americas
    MXN: { code: "MXN", name: "Mexican Peso", country: "Mexico", flag: "🇲🇽" },
    ARS: { code: "ARS", name: "Argentine Peso", country: "Argentina", flag: "🇦🇷" },
    CLP: { code: "CLP", name: "Chilean Peso", country: "Chile", flag: "🇨🇱" },
    COP: { code: "COP", name: "Colombian Peso", country: "Colombia", flag: "🇨🇴" },
    PEN: { code: "PEN", name: "Peruvian Sol", country: "Peru", flag: "🇵🇪" },

    // Europe
    NOK: { code: "NOK", name: "Norwegian Krone", country: "Norway", flag: "🇳🇴" },
    SEK: { code: "SEK", name: "Swedish Krona", country: "Sweden", flag: "🇸🇪" },
    DKK: { code: "DKK", name: "Danish Krone", country: "Denmark", flag: "🇩🇰" },
    PLN: { code: "PLN", name: "Polish Zloty", country: "Poland", flag: "🇵🇱" },
    CZK: { code: "CZK", name: "Czech Koruna", country: "Czech Republic", flag: "🇨🇿" },
    HUF: { code: "HUF", name: "Hungarian Forint", country: "Hungary", flag: "🇭🇺" },
    RON: { code: "RON", name: "Romanian Leu", country: "Romania", flag: "🇷🇴" },
    BGN: { code: "BGN", name: "Bulgarian Lev", country: "Bulgaria", flag: "🇧🇬" },
    HRK: { code: "HRK", name: "Croatian Kuna", country: "Croatia", flag: "🇭🇷" },
    TRY: { code: "TRY", name: "Turkish Lira", country: "Turkey", flag: "🇹🇷" },

    // Cryptocurrencies (if needed)
    BTC: { code: "BTC", name: "Bitcoin", country: "Digital", flag: "₿" },
    ETH: { code: "ETH", name: "Ethereum", country: "Digital", flag: "⟠" },

    // Other important currencies
    NZD: { code: "NZD", name: "New Zealand Dollar", country: "New Zealand", flag: "🇳🇿" },
    ILS: { code: "ILS", name: "Israeli Shekel", country: "Israel", flag: "🇮🇱" },
    QAR: { code: "QAR", name: "Qatari Riyal", country: "Qatar", flag: "🇶🇦" },
    KWD: { code: "KWD", name: "Kuwaiti Dinar", country: "Kuwait", flag: "🇰🇼" },
    BHD: { code: "BHD", name: "Bahraini Dinar", country: "Bahrain", flag: "🇧🇭" },
    OMR: { code: "OMR", name: "Omani Rial", country: "Oman", flag: "🇴🇲" },
    JOD: { code: "JOD", name: "Jordanian Dinar", country: "Jordan", flag: "🇯🇴" },
    LBP: { code: "LBP", name: "Lebanese Pound", country: "Lebanon", flag: "🇱🇧" },
  };
}

/* Get currency information by code for auto-filling forms */
export const getCurrencyInfo = action({
  args: {
    code: v.string()
  },
  returns: v.union(
    v.object({
      found: v.literal(true),
      data: v.object({
        code: v.string(),
        name: v.string(),
        country: v.string(),
        flag: v.string(),
      })
    }),
    v.object({
      found: v.literal(false),
      message: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const currencyCode = args.code.toUpperCase();
    const currencyData = getCurrencyDataMap();
    const currencyInfo = currencyData[currencyCode];

    if (currencyInfo) {
      return {
        found: true as const,
        data: currencyInfo
      };
    }

    return {
      found: false as const,
      message: `Currency code "${currencyCode}" not found. Please enter details manually.`
    };
  },
});