declare module 'world-currencies' {
  interface CurrencyData {
    name: string;
    iso?: {
      code: string;
    };
    units?: {
      major?: {
        symbol: string;
      };
      minor?: {
        name: string;
        symbol: string;
        majorValue: number;
      };
    };
    coins?: {
      frequent?: string[];
      rare?: string[];
    };
    banknotes?: {
      frequent?: string[];
      rare?: string[];
    };
  }

  const currencies: { [currencyCode: string]: CurrencyData };
  export = currencies;
}