// Analytics — privacy-conscious, opt-in event emitter (Phase 1, T4).
export { track, isAnalyticsEnabled, setAnalyticsSink } from './emitter';
export type { AnalyticsSink, AnalyticsPayload } from './emitter';
export {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type AnalyticsContext,
  type EventProps,
  type ModuleKey,
} from './events';
