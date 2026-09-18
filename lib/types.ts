export type VideoFormatOption = {
  itag: number;
  /** Set when video is DASH: mux this audio itag with `itag`. */
  audioItag: number | null;
  qualityLabel: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  codecs: string;
  contentLength: number | null;
  fps: number | null;
};

export type VideoMetadata = {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  formats: VideoFormatOption[];
};

export type ApiError = {
  error: string;
};
