/**
 * Localised messages of a component (validation messages, etc.).
 *
 * The language is the one of the closest `lang` attribute, else the browser
 * language. A regional variant ("fr-CA") falls back to its base language
 * ("fr"), then to English.
 */

/** Language of the page around `el`, in lower case ("" when unknown). */
export function pageLang(el) {
  return (el.closest('[lang]')?.getAttribute('lang') || navigator.language || '').toLowerCase();
}

/**
 * Creates the message catalogue of a component.
 *
 * @template {string} K
 * @param {{ en: Record<K, string> } & Record<string, Partial<Record<K, string>>>} catalog
 *   Messages by language. `en` must hold every key.
 */
export function createMessages(catalog) {
  const byLang = new Map(Object.entries(catalog).map(([lang, entries]) => [lang.toLowerCase(), { ...entries }]));
  return {
    /**
     * The message `key` in the language of `el`.
     * @param {Element} el
     * @param {K} key
     * @returns {string}
     */
    get(el, key) {
      const lang = pageLang(el);
      for (const candidate of [lang, lang.split('-')[0], 'en']) {
        const message = byLang.get(candidate)?.[key];
        if (message != null) return message;
      }
      return '';
    },
    /**
     * Adds or overrides messages for a language.
     * @param {string} lang
     * @param {Partial<Record<K, string>>} entries
     */
    register(lang, entries) {
      const key = String(lang).toLowerCase();
      byLang.set(key, { ...byLang.get(key), ...entries });
    },
  };
}
