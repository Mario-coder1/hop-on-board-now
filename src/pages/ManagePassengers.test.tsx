import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagePassengers from './ManagePassengers';

const mocks = vi.hoisted(() => ({
  profile: { id: 'driver' },
  update: vi.fn(), navigate: vi.fn(), stopTracking: vi.fn(),
  ride: { id: 'test-ride', driver_id: 'driver', status: 'in_progress',
    origin_address: 'Zvolen', destination_address: 'Banská Bystrica',
    origin_lat: 48.57, origin_lng: 19.12, destination_lat: 48.736, destination_lng: 19.146,
  },
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ rideId: 'test-ride' }), useNavigate: () => mocks.navigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useDriverTracking', () => ({ useLocationBroadcast: () => ({
  isTracking: true, startTracking: vi.fn(), stopTracking: mocks.stopTracking,
}) }));
vi.mock('@/hooks/useGasStations', () => ({ useGasStations: () => [] }));
vi.mock('@/components/Map', () => ({ default: () => null }));
vi.mock('@/components/Navigation', () => ({ default: () => null }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/LiveRouteEditor', () => ({ default: () => null }));
vi.mock('@/components/PinEntryDialog', () => ({ PinEntryDialog: () => null }));
vi.mock('@/lib/stripe', () => ({ isPaymentsEnabled: () => false, getStripeEnvironment: () => 'test' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const chain = {
      select: () => chain, eq: () => chain,
      single: async () => ({ data: mocks.ride, error: null }),
      in: async () => ({ data: [], error: null }),
      update: (value: unknown) => {
        mocks.update(table, value);
        return { eq: async () => ({ error: null }), in: async () => ({ error: null }) };
      },
    };
    return chain;
  },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));

let gpsCallbacks: PositionCallback[];
beforeEach(() => {
  vi.clearAllMocks();
  gpsCallbacks = [];
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn((callback: PositionCallback) => { gpsCallbacks.push(callback); return gpsCallbacks.length; }),
    getCurrentPosition: vi.fn((callback: PositionCallback) => { gpsCallbacks.push(callback); }),
    clearWatch: vi.fn(),
  } });
});
afterEach(cleanup);

describe('Driver-controlled arrival', () => {
  it('does not complete a ride when GPS reaches the Banská Bystrica destination', async () => {
    render(<ManagePassengers />);
    await screen.findByRole('button', { name: 'Som v cieli' });
    await act(async () => {
      for (const callback of gpsCallbacks) callback({ coords: {
        latitude: 48.736, longitude: 19.146, accuracy: 1,
      }, timestamp: Date.now() } as GeolocationPosition);
    });
    expect(gpsCallbacks.length).toBeGreaterThan(0);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.stopTracking).not.toHaveBeenCalled();
  });

  it('completes only after manual arrival confirmation, without requiring GPS at the destination', async () => {
    render(<ManagePassengers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Som v cieli' }));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Som v cieli' }));
    fireEvent.click(screen.getByRole('button', { name: 'Áno, ukončiť' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledExactlyOnceWith('rides', { status: 'completed' }));
    expect(mocks.stopTracking).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith('/driver');
  });
});