import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const insertMock = vi.fn();
const playlistInsertMock = vi.fn();
const setCredentialsMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      // Must be a constructible function (not an arrow function) — the
      // publisher calls `new google.auth.OAuth2(...)`.
      OAuth2: vi.fn().mockImplementation(function (this: { setCredentials: typeof setCredentialsMock }) {
        this.setCredentials = setCredentialsMock;
      }),
    },
    youtube: vi.fn().mockImplementation(() => ({
      videos: { insert: insertMock },
      playlistItems: { insert: playlistInsertMock },
    })),
  },
}));

const { YouTubePublisher, loadYouTubeCredentialsFromEnv } = await import('../youtube.js');

const validCredentials = {
  client_id: 'test-client-id',
  client_secret: 'test-client-secret',
  refresh_token: 'test-refresh-token',
};

describe('YouTubePublisher', () => {
  let videoPath: string;
  let dir: string;

  beforeEach(() => {
    insertMock.mockReset();
    playlistInsertMock.mockReset();
    setCredentialsMock.mockReset();
    dir = mkdtempSync(join(tmpdir(), 'yt-publisher-'));
    videoPath = join(dir, 'episode.mp4');
    writeFileSync(videoPath, 'fake-video-bytes');
  });

  it('throws if any credential field is missing', () => {
    expect(() => new YouTubePublisher({ client_id: '', client_secret: 'x', refresh_token: 'y' })).toThrow(
      /requires client_id/
    );
  });

  it('sets OAuth2 credentials on construction', () => {
    new YouTubePublisher(validCredentials);
    expect(setCredentialsMock).toHaveBeenCalledWith({ refresh_token: 'test-refresh-token' });
  });

  it('rejects a publish request missing made_for_kids', async () => {
    const publisher = new YouTubePublisher(validCredentials);
    await expect(
      publisher.publish({
        file_path: videoPath,
        title: 't',
        description: 'd',
        tags: [],
        privacy_status: 'private',
        // @ts-expect-error intentionally omitted for the test
        made_for_kids: undefined,
      })
    ).rejects.toThrow(/made_for_kids/);
  });

  it('rejects a publish request for a missing video file', async () => {
    const publisher = new YouTubePublisher(validCredentials);
    await expect(
      publisher.publish({
        file_path: join(dir, 'does-not-exist.mp4'),
        title: 't',
        description: 'd',
        tags: [],
        privacy_status: 'private',
        made_for_kids: true,
      })
    ).rejects.toThrow();
  });

  it('publishes and returns a video url on success', async () => {
    insertMock.mockResolvedValue({ data: { id: 'abc123' } });
    const publisher = new YouTubePublisher(validCredentials);

    const result = await publisher.publish({
      file_path: videoPath,
      title: 'Episode 1',
      description: 'desc',
      tags: ['opsly'],
      privacy_status: 'unlisted',
      made_for_kids: false,
    });

    expect(result.video_id).toBe('abc123');
    expect(result.url).toBe('https://www.youtube.com/watch?v=abc123');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const callArgs = insertMock.mock.calls[0]?.[0];
    expect(callArgs.requestBody.status.selfDeclaredMadeForKids).toBe(false);
    expect(playlistInsertMock).not.toHaveBeenCalled();
  });

  it('adds the video to a playlist when playlist_id is given', async () => {
    insertMock.mockResolvedValue({ data: { id: 'xyz789' } });
    playlistInsertMock.mockResolvedValue({ data: {} });
    const publisher = new YouTubePublisher(validCredentials);

    await publisher.publish({
      file_path: videoPath,
      title: 'Episode 1',
      description: 'desc',
      tags: [],
      privacy_status: 'public',
      made_for_kids: true,
      playlist_id: 'PL123',
    });

    expect(playlistInsertMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the API response has no video id', async () => {
    insertMock.mockResolvedValue({ data: {} });
    const publisher = new YouTubePublisher(validCredentials);
    await expect(
      publisher.publish({
        file_path: videoPath,
        title: 't',
        description: 'd',
        tags: [],
        privacy_status: 'private',
        made_for_kids: true,
      })
    ).rejects.toThrow(/did not return a video id/);
  });
});

describe('loadYouTubeCredentialsFromEnv', () => {
  it('throws a helpful error when env vars are missing', () => {
    expect(() => loadYouTubeCredentialsFromEnv({})).toThrow(/YOUTUBE_CLIENT_ID/);
  });

  it('reads credentials from the given env object', () => {
    const creds = loadYouTubeCredentialsFromEnv({
      YOUTUBE_CLIENT_ID: 'id',
      YOUTUBE_CLIENT_SECRET: 'secret',
      YOUTUBE_REFRESH_TOKEN: 'token',
    } as NodeJS.ProcessEnv);
    expect(creds).toEqual({ client_id: 'id', client_secret: 'secret', refresh_token: 'token' });
  });
});
