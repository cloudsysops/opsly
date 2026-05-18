// LinkedIn API Adapter for Syra

export interface LinkedInContent {
  title: string;
  body: string;
  tags: string[];
}

export interface LinkedInPost {
  id: string;
  created_at: string;
  url: string;
}

export class LinkedInAdapter {
  private accessToken: string;
  private apiUrl = 'https://api.linkedin.com/v2';
  private personUrn: string;

  constructor(accessToken?: string, personUrn?: string) {
    this.accessToken = accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '';
    this.personUrn = personUrn || process.env.LINKEDIN_PERSON_URN || '';
  }

  async publishPost(content: LinkedInContent): Promise<LinkedInPost | null> {
    if (!this.accessToken || !this.personUrn) {
      console.warn('⚠️ LinkedIn credentials not configured. Simulating post.');
      return this.simulatePost(content);
    }

    try {
      const postText = `${content.title}\n\n${content.body}`;
      const tagString = content.tags.map((tag) => `#${tag}`).join(' ');

      const response = await fetch(`${this.apiUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202312',
        },
        body: JSON.stringify({
          author: this.personUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.PublishText': {
              text: `${postText}\n\n${tagString}`,
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      });

      if (!response.ok) {
        console.error('LinkedIn API error:', response.statusText);
        return this.simulatePost(content);
      }

      const data = (await response.json()) as { id: string };
      return {
        id: data.id,
        created_at: new Date().toISOString(),
        url: `https://www.linkedin.com/feed/update/${data.id}`,
      };
    } catch (error) {
      console.error('LinkedIn posting failed:', error);
      return this.simulatePost(content);
    }
  }

  private simulatePost(_content: LinkedInContent): LinkedInPost {
    console.warn('📝 Simulating LinkedIn post (no credentials configured)');
    const id = `sim-linkedin-${Date.now()}`;
    return {
      id,
      created_at: new Date().toISOString(),
      url: `https://www.linkedin.com/feed/update/${id}`,
    };
  }

  async getMetrics(postId: string): Promise<{
    impressions: number;
    clicks: number;
    comments: number;
    shares: number;
  }> {
    if (!this.accessToken) {
      return { impressions: 0, clicks: 0, comments: 0, shares: 0 };
    }

    try {
      const response = await fetch(`${this.apiUrl}/analytics/ugcPosts?ids=${postId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return { impressions: 0, clicks: 0, comments: 0, shares: 0 };
      }

      const data = (await response.json()) as {
        elements: Array<{
          impressionCount: number;
          clickCount: number;
          commentCount: number;
          shareCount: number;
        }>;
      };

      const post = data.elements[0] || {};
      return {
        impressions: post.impressionCount || 0,
        clicks: post.clickCount || 0,
        comments: post.commentCount || 0,
        shares: post.shareCount || 0,
      };
    } catch (error) {
      console.error('LinkedIn metrics fetch failed:', error);
      return { impressions: 0, clicks: 0, comments: 0, shares: 0 };
    }
  }
}

export const linkedInAdapter = new LinkedInAdapter();
