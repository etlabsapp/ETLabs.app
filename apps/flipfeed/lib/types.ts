export type WidgetType = "weather" | "custom_feed" | "clock" | "sports" | "twitch" | "etlabs_app";

export type WeatherConfig = {
  type: "weather";
  location: string;
};

export type CustomFeedConfig = {
  type: "custom_feed";
  feedUrl: string;
  name?: string;
};

export type ClockConfig = {
  type: "clock";
  timezone?: string;
};

/** ET Labs app (e.g. SleepTight) — shows download count from dashboard / tracked_apps */
export type EtlabsAppConfig = {
  type: "etlabs_app";
  appName: string;
};

export type WidgetConfig = WeatherConfig | CustomFeedConfig | ClockConfig | EtlabsAppConfig;

export type UserConfig = {
  widgets: WidgetConfig[];
};

export const DEFAULT_CONFIG: UserConfig = {
  widgets: [],
};
