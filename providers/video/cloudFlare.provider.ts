
import { VideoProvider, CreateVideoResult, VideoInfo } from './types';
export class CloudflareVideoProvider implements VideoProvider {
  private apiToken: string;
  private accountId: string;
  constructor() {
    this.apiToken = process.env.CF_API_TOKEN || '';
    this.accountId = process.env.CF_ACCOUNT_ID || '';
  }
  async createVideo(title: string): Promise<CreateVideoResult> {
    // POST https://api.cloudflare.com/client/v4/accounts/{id}/stream
    // Retorna { uid, uploadURL }
    const videoId = "123"
    const uploadUrl = "sdihtferiw"
    return { videoId, uploadUrl }
  }
  getPlaybackUrl(videoId: string): string {
    return `https://customer-{hash}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
  }
  generatePlaybackUrl(videoId: string): string {
    // Cloudflare usa signed tokens com JWT ou expiração por URL
    // https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
    return `https://`;
  }
  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    // GET https://api.cloudflare.com/client/v4/accounts/{id}/stream/{id}
    return {
      status: "",
      duration: 0,
      thumbnailUrl: this.getThumbnailUrl(videoId),
      playbackUrl: this.getPlaybackUrl(videoId),
    };
  }
  parseWebhookStatus(status: number): string {
    // Mapear status do webhook Cloudflare
    return 'unknown';
  }
  async deleteVideo(videoId: string): Promise<void> {
    // DELETE https://api.cloudflare.com/client/v4/accounts/{id}/stream/{id}
  }
  getThumbnailUrl(videoId: string): string {
    return `https://customer-{hash}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
  }
}