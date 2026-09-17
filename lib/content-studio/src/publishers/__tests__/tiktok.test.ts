import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { TikTokPublisher, loadTikTokCredentialsFromEnv } = await import('../tiktok.js');

const validCredentials = { access_token: 'test-access-token' };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  } as Response;
}

describe('TikTokPublisher', () => {
  let videoPath: string;
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tiktok-publisher-'));
    videoPath = join(dir, 'episode.mp4');
    writeFileSync(videoPath, 'fake-video-bytes');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('throws if access_token is missing', () => {
    expect(() => new TikTokPublisher({ access_token: '' })).toThrow(/requires access_token/);
  });

  it('rejects a publish request for a missing video file', async () => {
    const publisher = new TikTokPublisher(validCredentials);
    await expect(
      publisher.publish({
        file_path: join(dir, 'does-not-exist.mp4'),
        title: 't',
        privacy_level: 'SELF_ONLY',
      })
    ).rejects.toThrow();
  });

  it('publishes and returns a publish_id on success', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { publish_id: 'p123', upload_url: 'https://upload.tiktok.example/x' } })
      )
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as Response);

    const publisher = new TikTokPublisher(validCredentials);
    const result = await publisher.publish({
      file_path: videoPath,
      title: 'Episode 1',
      privacy_level: 'PUBLIC_TO_EVERYONE',
    });

    expect(result.publish_id).toBe('p123');
    expect(result.status).toBe('PROCESSING_UPLOAD');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const initCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(initCall[0]).toBe('https://open.tiktokapis.com/v2/post/publish/video/init/');
    expect(initCall[1].headers).toMatchObject({ Authorization: 'Bearer test-access-token' });
    const initBody = JSON.parse(initCall[1].body as string);
    expect(initBody.post_info.title).toBe('Episode 1');
    expect(initBody.post_info.privacy_level).toBe('PUBLIC_TO_EVERYONE');

    const uploadCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(uploadCall[0]).toBe('https://upload.tiktok.example/x');
    expect(uploadCall[1].method).toBe('PUT');
  });

  it('throws when init response has an error code', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: 'invalid_param', message: 'bad title' } }, false, 400)
    );
    const publisher = new TikTokPublisher(validCredentials);
    await expect(
      publisher.publish({ file_path: videoPath, title: 't', privacy_level: 'SELF_ONLY' })
    ).rejects.toThrow(/bad title/);
  });

  it('throws when init response is missing publish_id/upload_url', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }));
    const publisher = new TikTokPublisher(validCredentials);
    await expect(
      publisher.publish({ file_path: videoPath, title: 't', privacy_level: 'SELF_ONLY' })
    ).rejects.toThrow(/did not return publish_id/);
  });

  it('throws when the upload PUT fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { publish_id: 'p123', upload_url: 'https://upload.tiktok.example/x' } })
      )
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' } as Response);

    const publisher = new TikTokPublisher(validCredentials);
    await expect(
      publisher.publish({ file_path: videoPath, title: 't', privacy_level: 'SELF_ONLY' })
    ).rejects.toThrow(/TikTok video upload failed/);
  });
});

describe('loadTikTokCredentialsFromEnv', () => {
  it('throws a helpful error when env vars are missing', () => {
    expect(() => loadTikTokCredentialsFromEnv({})).toThrow(/TIKTOK_ACCESS_TOKEN/);
  });

  it('reads the access token from the given env object', () => {
    const creds = loadTikTokCredentialsFromEnv({ TIKTOK_ACCESS_TOKEN: 'tok' } as NodeJS.ProcessEnv);
    expect(creds).toEqual({ access_token: 'tok' });
  });
});
