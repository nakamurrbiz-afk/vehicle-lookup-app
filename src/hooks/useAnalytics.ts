import { usePostHog } from 'posthog-react-native';

export type AnalyticsEvent =
  | { name: 'search_initiated';       props: { country: string; plate_length: number; has_postcode: boolean } }
  | { name: 'search_success';         props: { country: string; make: string; model: string } }
  | { name: 'search_error';           props: { country: string; error: string } }
  | { name: 'country_changed';        props: { from: string; to: string } }
  | { name: 'location_detect_tapped'; props: Record<string, never> }
  | { name: 'location_detected';      props: { success: boolean } }
  | { name: 'recent_card_tapped';     props: { country: string } }
  | { name: 'history_opened';         props: Record<string, never> }
  | { name: 'history_cleared';        props: { count: number } }
  | { name: 'history_entry_deleted';  props: Record<string, never> };

export function useAnalytics() {
  const posthog = usePostHog();

  function track(event: AnalyticsEvent) {
    try {
      posthog?.capture(event.name, event.props as Record<string, unknown>);
    } catch {
      // アナリティクスの失敗はアプリに影響させない
    }
  }

  return { track };
}
