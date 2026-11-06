import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CookieBanner, { COOKIE_CONSENT_STORAGE_KEY } from '../../src/components/CookieBanner';

describe('CookieBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains current storage use and asks for an explicit choice', () => {
    render(<CookieBanner />);

    expect(screen.getByRole('region', { name: 'Cookie and storage preferences' })).toBeVisible();
    expect(screen.getByText(/uses local storage for essential features/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Allow necessary storage' })).toBeVisible();
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('records an explicit necessary-only choice with an ISO timestamp', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(screen.getByRole('button', { name: 'Allow necessary storage' }));

    const savedConsent: unknown = JSON.parse(
      localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? 'null',
    );
    if (typeof savedConsent !== 'object' || savedConsent === null ||
        !('choice' in savedConsent) || savedConsent.choice !== 'necessary' ||
        !('consentedAt' in savedConsent) || typeof savedConsent.consentedAt !== 'string') {
      throw new Error('Stored consent has an invalid shape.');
    }
    expect(new Date(savedConsent.consentedAt).toISOString()).toBe(savedConsent.consentedAt);
    expect(screen.queryByRole('region', { name: 'Cookie and storage preferences' }))
      .not.toBeInTheDocument();
  });

  it('does not show again when a valid choice is already stored', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
      choice: 'necessary',
      consentedAt: new Date().toISOString(),
    }));

    render(<CookieBanner />);

    expect(screen.queryByRole('region', { name: 'Cookie and storage preferences' }))
      .not.toBeInTheDocument();
  });

  it('asks again when a stored choice is invalid', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
      choice: 'all',
      consentedAt: 'not-a-date',
    }));

    render(<CookieBanner />);

    expect(screen.getByRole('alert')).toHaveTextContent(/was not recognized/i);
    expect(screen.getByRole('button', { name: 'Allow necessary storage' })).toBeVisible();
  });

  it('keeps the banner visible if the choice cannot be saved', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'QuotaExceededError');
    });
    render(<CookieBanner />);

    await user.click(screen.getByRole('button', { name: 'Allow necessary storage' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/preference could not be saved/i);
    expect(screen.getByRole('region', { name: 'Cookie and storage preferences' })).toBeVisible();
  });
});
