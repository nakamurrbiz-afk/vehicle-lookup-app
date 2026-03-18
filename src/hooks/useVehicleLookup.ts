import { useState } from 'react';
import { lookupVehicle, VehicleResult, ApiError } from '../api/vehicle';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: VehicleResult }
  | { status: 'error'; error: ApiError };

export function useVehicleLookup() {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function lookup(plate: string, country: string, state?: string) {
    setState({ status: 'loading' });
    try {
      const result = await lookupVehicle(plate, country, state);
      if (result.ok) {
        setState({ status: 'success', data: result.data });
      } else {
        setState({ status: 'error', error: result.error });
      }
    } catch (err) {
      setState({
        status: 'error',
        error: {
          status: 0,
          title: 'Network Error',
          detail: 'Could not reach the server. Check your connection.',
        },
      });
    }
  }

  function reset() {
    setState({ status: 'idle' });
  }

  return { state, lookup, reset };
}
