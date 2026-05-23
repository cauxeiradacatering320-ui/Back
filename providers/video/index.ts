import type { VideoProvider, VideoData } from './types';
import { BunnyVideoProvider } from './bunny.provider';
import {CloudflareVideoProvider} from './cloudFlare.provider'
let _provider: VideoProvider | null = null;

export function getVideoProvider(): VideoProvider {
  if (!_provider) {
    const providerName = process.env.VIDEO_PROVIDER || 'cloudflare';

    switch (providerName) {
      case 'bunny':
         console.log("bunny")
        _provider = new BunnyVideoProvider();
        break;
      case 'cloudflare':
        console.log("cloud")
         _provider = new CloudflareVideoProvider();
        break;
      default:
        throw new Error(`Video provider "${providerName}" não implementado`);
    }
  }

  return _provider;
}

export function resetProvider(): void {
  _provider = null;
}

export type { VideoProvider, VideoData } from './types';
