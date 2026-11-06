import { useState } from 'react';

export const COOKIE_CONSENT_STORAGE_KEY = 'octocat-cookie-consent';

interface CookieConsent {
  choice: 'necessary';
  consentedAt: string;
}

interface ConsentState {
  consent: CookieConsent | null;
  error: string | null;
}

function isCookieConsent(value: unknown): value is CookieConsent {
  if (typeof value !== 'object' || value === null || !('choice' in value) ||
      !('consentedAt' in value)) {
    return false;
  }

  if (value.choice !== 'necessary' || typeof value.consentedAt !== 'string') {
    return false;
  }

  const date = new Date(value.consentedAt);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value.consentedAt;
}

function loadConsent(): ConsentState {
  let savedConsent: string | null;
  try {
    savedConsent = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return {
      consent: null,
      error: 'Your saved cookie preference could not be checked. Please confirm your choice again.',
    };
  }

  if (savedConsent === null) {
    return { consent: null, error: null };
  }

  try {
    const parsed: unknown = JSON.parse(savedConsent);
    if (isCookieConsent(parsed)) {
      return { consent: parsed, error: null };
    }
  } catch {
    return {
      consent: null,
      error: 'Your saved cookie preference could not be read. Please confirm your choice again.',
    };
  }

  return {
    consent: null,
    error: 'Your saved cookie preference was not recognized. Please confirm your choice again.',
  };
}

function CookieBanner() {
  const [state, setState] = useState(loadConsent);

  const allowNecessaryStorage = () => {
    const consent: CookieConsent = {
      choice: 'necessary',
      consentedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
      setState({ consent, error: null });
    } catch {
      setState({
        consent: null,
        error: 'Your preference could not be saved. Please try again; this banner will remain visible.',
      });
    }
  };

  if (state.consent) {
    return null;
  }

  return (
    <section
      role="region"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-300 bg-white p-4 text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:p-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h2 id="cookie-banner-title" className="mb-1 text-lg font-semibold">
            Cookie and storage preferences
          </h2>
          <p id="cookie-banner-description" className="text-sm">
            This app uses local storage for essential features such as your cart and theme. It does
            not currently use optional cookies for analytics or advertising. Choose below to allow
            this necessary storage and save your preference.
          </p>
          {state.error && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
              {state.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={allowNecessaryStorage}
          className="shrink-0 rounded bg-green-800 px-5 py-3 font-semibold text-white hover:bg-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
        >
          Allow necessary storage
        </button>
      </div>
    </section>
  );
}

export default CookieBanner;
