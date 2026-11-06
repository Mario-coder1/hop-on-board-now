import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { notificationLink } from './notificationLink';

describe('broadcast notification links', () => {
  it('addresses the specific stored notification', () => {
    expect(notificationLink('80cf9487-83a0-4de4-85ad-682304e31e8e')).toBe('/profile?notification=80cf9487-83a0-4de4-85ad-682304e31e8e');
  });
  it('encodes identifiers without adding other query parameters', () => {
    expect(new URL(notificationLink('message&other=1'), 'https://takeme.sk').searchParams.get('notification')).toBe('message&other=1');
  });
  it('waits for an existing window to navigate before focusing it', async () => {
    const handlers: Record<string, (event: any) => void> = {};
    const navigate = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn().mockResolvedValue(undefined);
    const openWindow = vi.fn();
    const self = { location: { origin: 'https://takeme.sk' }, addEventListener: (type: string, handler: any) => { handlers[type] = handler; } };
    const clients = { matchAll: async () => [{ url: 'https://takeme.sk/passenger', navigate, focus }], openWindow };
    new Function('self', 'clients', readFileSync('public/push-sw.js', 'utf8'))(self, clients);
    let work: Promise<unknown> | undefined;
    handlers.notificationclick({ notification: { close: vi.fn(), data: { url: notificationLink('specific') } }, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
    await work;
    expect(navigate).toHaveBeenCalledWith('https://takeme.sk/profile?notification=specific');
    expect(focus).toHaveBeenCalledOnce();
    expect(openWindow).not.toHaveBeenCalled();
  });
});