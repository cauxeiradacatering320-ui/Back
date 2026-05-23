export interface VideoInfo {
  status: string;
  duration: number;
  thumbnailUrl: string;
  playbackUrl: string;
}

export interface VideoProvider {
  createVideo(title: string): Promise<CreateVideoResult>;
  getPlaybackUrl(videoId: string): string;
  getThumbnailUrl(videoId: string): string;
  getVideoInfo(videoId: string): Promise<VideoInfo>;
  parseWebhookStatus(status: number): string;
  generatePlaybackUrl(videoId: string): string;
  deleteVideo(videoId: string): Promise<void>;
}

export interface CreateVideoResult {
  videoId: string;
  uploadUrl: string;
}

export interface VideoData {
  provider: string;
  videoId: string;
  libraryId: string;
  thumbnailUrl: string;
  duration: number;
  status: string;
}
