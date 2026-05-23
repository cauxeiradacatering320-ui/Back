import crypto from 'crypto';
import type { VideoProvider, CreateVideoResult, VideoInfo } from './types';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

const STATUS_MAP: Record<number, string> = {
  0: 'created',
  1: 'uploaded',
  2: 'processing',
  3: 'ready',
  4: 'ready',
  5: 'error',
};

const FIVE_MINUTES = 300;

export class BunnyVideoProvider implements VideoProvider {
  private apiKey: string;
  private libraryId: string;
  private cdnHostname: string;
  private securityKey: string;

  constructor() {
    this.apiKey = process.env.BUNNY_API_KEY || '';
    this.libraryId = process.env.BUNNY_LIBRARY_ID || '';
    this.cdnHostname = process.env.BUNNY_CDN_HOSTNAME || '';
    this.securityKey = process.env.BUNNY_STREAM_SECURITY_KEY || '';

    if (!this.apiKey || !this.libraryId || !this.cdnHostname) {
      throw new Error('BUNNY_API_KEY, BUNNY_LIBRARY_ID e BUNNY_CDN_HOSTNAME são obrigatórios');
    }

    if (!this.securityKey) {
      throw new Error('BUNNY_STREAM_SECURITY_KEY é obrigatório para token auth');
    }
  }

  async createVideo(title: string): Promise<CreateVideoResult> {
    const response = await fetch(
      `${BUNNY_API_BASE}/library/${this.libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bunny API error (create): ${response.status} ${text}`);
    }

    const data = await response.json() as { guid: string };
    const videoId: string = data.guid;

    const uploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;

    return { videoId, uploadUrl };
  }

  getPlaybackUrl(videoId: string): string {
    return `https://${this.cdnHostname}/${videoId}/playlist.m3u8`;
  }

  getThumbnailUrl(videoId: string): string {
    return `https://${this.cdnHostname}/${videoId}/thumbnail.jpg`;
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const response = await fetch(
      `${BUNNY_API_BASE}/library/${this.libraryId}/videos/${videoId}`,
      {
        headers: { 'AccessKey': this.apiKey },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bunny API error (info): ${response.status} ${text}`);
    }

    const data = await response.json() as {
      status: number;
      length: number;
    };

    return {
      status: this.parseWebhookStatus(data.status),
      duration: data.length || 0,
      thumbnailUrl: this.getThumbnailUrl(videoId),
      playbackUrl: this.getPlaybackUrl(videoId),
    };
  }

  generatePlaybackUrl(videoId: string): string {
    const path = `/${videoId}/playlist.m3u8`;
    const expires = Math.floor(Date.now() / 1000) + FIVE_MINUTES;
    const token = crypto
      .createHash('sha256')
      .update(this.securityKey + path + expires)
      .digest('hex');

    return `https://${this.cdnHostname}${path}?token=${token}&expires=${expires}`;
  }

  async deleteVideo(videoId: string): Promise<void> {
    const response = await fetch(
      `${BUNNY_API_BASE}/library/${this.libraryId}/videos/${videoId}`,
      {
        method: 'DELETE',
        headers: { 'AccessKey': this.apiKey },
      }
    );

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(`Bunny API error (delete): ${response.status} ${text}`);
    }
  }

  parseWebhookStatus(status: number): string {
    return STATUS_MAP[status] || 'unknown';
  }
}
