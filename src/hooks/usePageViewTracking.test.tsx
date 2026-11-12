import { renderHook, act, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { usePageViewTracking } from './usePageViewTracking';

vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: () => Promise.resolve() }) } }));

let standalone = false;
const track = vi.fn((_event: string, _properties?: Record<string, unknown>) => 'event-id');
const consent = (analytics: boolean) => {
  localStorage.setItem('takeme_cookie_consent_v1', JSON.stringify({ analytics }));
  window.dispatchEvent(new Event('cookie-consent-changed'));
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  standalone = false;
  track.mockClear();
  track.mockReturnValue('event-id');
  window.__lovableEvents = { track };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({
    get matches() { return standalone; }, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Android Chrome' });
  consent(true);
});

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.__lovableEvents; });

describe('PWA observations', () => {
  it('records a completed browser install, not an install prompt', () => {
    renderHook(() => usePageViewTracking());
    act(() => window.dispatchEvent(new Event('beforeinstallprompt')));
    expect(track).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(track).toHaveBeenCalledExactlyOnceWith('project.pwa_install_observed', { source: 'browser_install', platform: 'android' });
  });

  it('detects an iPhone opening from the home screen', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'iPhone Safari' });
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    renderHook(() => usePageViewTracking());
    expect(track).toHaveBeenCalledWith('project.pwa_install_observed', { source: 'standalone_launch', platform: 'ios' });
    expect(track).toHaveBeenCalledWith('project.pwa_opened', { platform: 'ios' });
  });

  it('does not count the same installation again on subsequent launches', () => {
    standalone = true;
    const first = renderHook(() => usePageViewTracking());
    first.unmount();
    renderHook(() => usePageViewTracking());
    expect(track.mock.calls.filter(([name]) => name === 'project.pwa_install_observed')).toHaveLength(1);
    expect(track.mock.calls.filter(([name]) => name === 'project.pwa_opened')).toHaveLength(2);
  });

  it('waits for analytics consent and records nothing when declined', () => {
    consent(false);
    standalone = true;
    renderHook(() => usePageViewTracking());
    act(() => vi.advanceTimersByTime(3000));
    expect(track).not.toHaveBeenCalled();
    expect(localStorage.getItem('tm_pwa_install_observed_v1')).toBeNull();
    act(() => consent(true));
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('respects Global Privacy Control even with analytics consent', () => {
    standalone = true;
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    renderHook(() => usePageViewTracking());
    act(() => vi.advanceTimersByTime(3000));
    expect(track).not.toHaveBeenCalled();
  });

  it('retries when the injected event pipeline becomes available', () => {
    standalone = true;
    delete window.__lovableEvents;
    renderHook(() => usePageViewTracking());
    expect(localStorage.getItem('tm_pwa_install_observed_v1')).toBeNull();
    window.__lovableEvents = { track };
    act(() => vi.advanceTimersByTime(1000));
    expect(track).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(3000));
    expect(track).toHaveBeenCalledTimes(2);
  });
});