// Twitter/X API Adapter for Syra

export interface TwitterContent {
  threads: string[];
  hashtags: string[];
}

export interface TwitterPost {
  text: string;
  created_at: string;
  id: string;
}

export class TwitterAdapter {
  private bearerToken: string;
  private apiUrl = 'https://api.twitter.com/2';

  constructor(bearerToken?: string) {
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN || '';
  }

  async publishThreads(content: TwitterContent): Promise<TwitterPost[]> {
    if (!this.bearerToken) {
      console.warn('⚠️ Twitter bearer token not configured. Simulating post.');
      return this.simulatePost(content);
    }

    try {
      const posts: TwitterPost[] = [];

      // Post first tweet
      const firstTweet = await this.postTweet(content.threads[0]);
      if (!firstTweet) return [];
      posts.push(firstTweet);

      // Post remaining tweets as replies
      for (let i = 1; i < content.threads.length; i++) {
        const reply = await this.postTweet(content.threads[i], firstTweet.id);
        if (reply) posts.push(reply);
      }

      console.warn(`✅ Posted ${posts.length} tweets to Twitter`);
      return posts;
    } catch (error) {
      console.error('Twitter posting failed:', error);
      return this.simulatePost(content);
    }
  }

  private async postTweet(text: string, replyTo?: string): Promise<TwitterPost | null> {
    try {
      const response = await fetch(`${this.apiUrl}/tweets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...(replyTo && { reply: { in_reply_to_tweet_id: replyTo } }),
        }),
      });

      if (!response.ok) {
        console.error('Twitter API error:', response.statusText);
        return null;
      }

      const data = (await response.json()) as { data: { id: string } };
      return {
        text,
        created_at: new Date().toISOString(),
        id: data.data.id,
      };
    } catch (error) {
      console.error('Tweet posting error:', error);
      return null;
    }
  }

  private simulatePost(content: TwitterContent): TwitterPost[] {
    console.warn('📝 Simulating Twitter post (no credentials configured)');
    return content.threads.map((text, index) => ({
      text,
      created_at: new Date().toISOString(),
      id: `sim-twitter-${Date.now()}-${index}`,
    }));
  }

  async getMetrics(
    tweetId: string
  ): Promise<{ reach: number; likes: number; retweets: number; replies: number }> {
    if (!this.bearerToken) {
      return { reach: 0, likes: 0, retweets: 0, replies: 0 };
    }

    try {
      const response = await fetch(`${this.apiUrl}/tweets/${tweetId}?tweet.fields=public_metrics`, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      if (!response.ok) return { reach: 0, likes: 0, retweets: 0, replies: 0 };

      const data = (await response.json()) as {
        data: {
          public_metrics: {
            impression_count: number;
            like_count: number;
            retweet_count: number;
            reply_count: number;
          };
        };
      };

      return {
        reach: data.data.public_metrics.impression_count,
        likes: data.data.public_metrics.like_count,
        retweets: data.data.public_metrics.retweet_count,
        replies: data.data.public_metrics.reply_count,
      };
    } catch (error) {
      console.error('Metrics fetch failed:', error);
      return { reach: 0, likes: 0, retweets: 0, replies: 0 };
    }
  }
}

export const twitterAdapter = new TwitterAdapter();
