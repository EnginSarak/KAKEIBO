export const currencyConfig = {
  EUR: {
    symbol: "€",
    locale: "de-DE",
    position: "suffix",
    decimals: 2,
    thousandSeparator: ".",
    decimalSeparator: ",",
  },
  USD: {
    symbol: "$",
    locale: "en-US",
    position: "prefix",
    decimals: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
  CHF: {
    symbol: "CHF",
    locale: "de-CH",
    position: "suffix",
    decimals: 2,
    thousandSeparator: "'",
    decimalSeparator: ".",
  },
  GBP: {
    symbol: "£",
    locale: "en-GB",
    position: "prefix",
    decimals: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
  JPY: {
    symbol: "¥",
    locale: "ja-JP",
    position: "prefix",
    decimals: 0,
    thousandSeparator: ",",
    decimalSeparator: "",
  },
};

export const formatCurrency = (amount, currency = "EUR") => {
  const config = currencyConfig[currency] || currencyConfig.EUR;
  
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
  
  if (config.position === "prefix") {
    return `${config.symbol}${formatted}`;
  }
  return `${formatted} ${config.symbol}`;
};

export const parseCurrencyInput = (value, currency = "EUR") => {
  const config = currencyConfig[currency] || currencyConfig.EUR;
  let cleaned = value.replace(config.symbol, "").trim();
  if (config.decimalSeparator === ",") {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrencyInput = (value, currency = "EUR") => {
  const config = currencyConfig[currency] || currencyConfig.EUR;
  let numericValue = value.replace(/[^\d]/g, "");
  
  if (!numericValue) return "";
  const intValue = parseInt(numericValue, 10);
  const amount = config.decimals > 0 ? intValue / Math.pow(10, config.decimals) : intValue;
  
  return formatCurrency(amount, currency);
};
export const handleCurrencyInput = (rawInput, currency = "EUR") => {
  const config = currencyConfig[currency] || currencyConfig.EUR;
  const digits = rawInput.replace(/[^\d]/g, "");
  
  if (!digits) {
    return { display: "", value: 0 };
  }
  const cents = parseInt(digits, 10);
  const amount = config.decimals > 0 ? cents / Math.pow(10, config.decimals) : cents;
  
  return {
    display: formatCurrency(amount, currency),
    value: amount,
  };
};

export const currencyNames = {
  EUR: "Euro (€)",
  USD: "US Dollar ($)",
  CHF: "Swiss Franc (CHF)",
  GBP: "British Pound (£)",
  JPY: "Japanese Yen (¥)",
};

export default formatCurrency;
