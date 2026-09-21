const FALLBACK = "2026-09";

const MONTHS = {
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const raw = (process.env.REACT_APP_LEGAL_UPDATED || "").trim();
const stamp = /^\d{4}-(0[1-9]|1[0-2])/.test(raw) ? raw.slice(0, 7) : FALLBACK;

export function legalLastUpdated(language) {
  const [year, month] = stamp.split("-");
  const names = MONTHS[language] || MONTHS.de;
  return `${names[Number(month) - 1]} ${year}`;
}

export default legalLastUpdated;
