import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./input";
import { cn } from "../../lib/utils";
import { currencyConfig } from "../../lib/currency";

export function CurrencyInput({
  value,
  onChange,
  currency = "EUR",
  className,
  placeholder,
  ...props
}) {
  const config = currencyConfig[currency] || currencyConfig.EUR;
  const inputRef = useRef(null);
  const [rawDigits, setRawDigits] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const getDecimalSeparator = useCallback(() => {
    const formatted = new Intl.NumberFormat(config.locale).format(1.1);
    return formatted.charAt(1);
  }, [config.locale]);

  const getThousandSeparator = useCallback(() => {
    const formatted = new Intl.NumberFormat(config.locale).format(1000);
    return formatted.charAt(1);
  }, [config.locale]);

  const digitsToDisplay = useCallback((digits) => {
    if (!digits || digits === "") {
      if (config.decimals > 0) {
        return `0${getDecimalSeparator()}${"0".repeat(config.decimals)}`;
      }
      return "0";
    }

    const decimalSep = getDecimalSeparator();
    const thousandSep = getThousandSeparator();

    if (config.decimals === 0) {
      let integerPart = digits;

      if (integerPart.length > 3) {
        const formatted = [];
        let count = 0;
        for (let i = integerPart.length - 1; i >= 0; i--) {
          formatted.unshift(integerPart[i]);
          count++;
          if (count % 3 === 0 && i > 0) {
            formatted.unshift(thousandSep);
          }
        }
        integerPart = formatted.join("");
      }

      return integerPart;
    }

    const paddedDigits = digits.padStart(config.decimals + 1, "0");

    const decimalPart = paddedDigits.slice(-config.decimals);
    let integerPart = paddedDigits.slice(0, -config.decimals) || "0";

    integerPart = integerPart.replace(/^0+/, "") || "0";

    if (integerPart.length > 3) {
      const formatted = [];
      let count = 0;
      for (let i = integerPart.length - 1; i >= 0; i--) {
        formatted.unshift(integerPart[i]);
        count++;
        if (count % 3 === 0 && i > 0) {
          formatted.unshift(thousandSep);
        }
      }
      integerPart = formatted.join("");
    }

    return `${integerPart}${decimalSep}${decimalPart}`;
  }, [config.decimals, getDecimalSeparator, getThousandSeparator]);

  const digitsToNumber = useCallback((digits) => {
    if (!digits || digits === "") return 0;

    if (config.decimals === 0) {
      return parseInt(digits, 10) || 0;
    }

    const cents = parseInt(digits, 10) || 0;
    return cents / Math.pow(10, config.decimals);
  }, [config.decimals]);

  const numberToDigits = useCallback((num) => {
    if (num === 0 || num === null || num === undefined || isNaN(num)) return "";

    if (config.decimals === 0) {
      return Math.round(num).toString();
    }

    const cents = Math.round(num * Math.pow(10, config.decimals));
    return cents.toString();
  }, [config.decimals]);

  useEffect(() => {
    if (!isFocused) {
      setRawDigits(numberToDigits(value));
    }
  }, [value, currency, numberToDigits, isFocused]);

  const handleInputChange = (e) => {
    const input = e.target.value;

    const newDigits = input.replace(/[^0-9]/g, "");

    const limitedDigits = newDigits.slice(0, 15);

    const cleanedDigits = limitedDigits.replace(/^0+/, "") || "";

    setRawDigits(cleanedDigits);

    const numValue = digitsToNumber(cleanedDigits);
    onChange?.(numValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      if (rawDigits.length > 0) {
        const newDigits = rawDigits.slice(0, -1);
        setRawDigits(newDigits);

        const numValue = digitsToNumber(newDigits);
        onChange?.(numValue);
      }
    }

    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    setTimeout(() => {
      const input = e.target;
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    const decimalSep = getDecimalSeparator();
    if (config.decimals === 0) return "0";
    return `0${decimalSep}${"0".repeat(config.decimals)}`;
  };

  const displayValue = digitsToDisplay(rawDigits);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={getPlaceholder()}
        className={cn(
          "pr-12 text-left",
          className
        )}
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground font-medium">
        {config.symbol}
      </div>
    </div>
  );
}

export default CurrencyInput;
