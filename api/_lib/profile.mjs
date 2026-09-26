const PROJECT = 'kakeibo-application1';
const LANGS = ['de', 'en', 'es', 'fr', 'it'];

export const profileLanguage = async (token, uid, fallback = 'de') => {
  if (!uid) return fallback;

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${encodeURIComponent(uid)}?mask.fieldPaths=language`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return fallback;

    const gespeichert = (await response.json())?.fields?.language?.stringValue;
    return LANGS.includes(gespeichert) ? gespeichert : fallback;
  } catch (error) {
    void error;
    return fallback;
  }
};
