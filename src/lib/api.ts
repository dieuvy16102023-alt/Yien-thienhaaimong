export interface CharacterCommentReply {
  id: string;
  userId: string;
  user: string;
  avatar?: string;
  text: string;
  date: string;
}

export interface CharacterComment {
  id: string;
  userId: string;
  user: string;
  avatar?: string;
  text: string;
  date: string;
  replies: CharacterCommentReply[];
}

export interface Character {
  id: string;
  name: string;
  link: string;
  story: string;
  tags: string[];
  locked: boolean;
  passphrase?: string;
  likes: number;
  views: number;
  comments: CharacterComment[];
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'food' | 'drink';
  icon: string;
  desc: string;
  price: number;
  intimacyPoints: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  url: string;
}

export interface WebReview {
  id: string;
  userId: string;
  user: string;
  avatar?: string;
  stars: number;
  text: string;
  date: string;
}

export interface GlobalData {
  version: number;
  lastUpdated: number;
  chars: Character[];
  items: ShopItem[];
  music: MusicTrack[];
  webReviews: WebReview[];
}

export interface UserAuthInfo {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface UserState {
  userId: string;
  keys: number;
  inventory: Record<string, number>;
  intimacy: Record<string, number>;
  unlocked: string[];
  saved: string[];
  liked: string[];
  dailyClaimed: string;
}

const TOKEN_KEY = 'yien_galaxy_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Có lỗi xảy ra khi kết nối server.');
  }

  return data as T;
}

export const api = {
  getGlobalData: () => request<GlobalData>('/global'),

  subscribeGlobalData: (onUpdate: (data: GlobalData) => void) => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'UPDATE_GLOBAL' && parsed.data) {
            onUpdate(parsed.data);
          }
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };
      eventSource.onerror = () => {
        // Retry silently
      };
    } catch (e) {
      console.warn('SSE stream not supported or error:', e);
    }
    return () => {
      eventSource?.close();
    };
  },

  register: async (username: string, password: string) => {
    const res = await request<{ user: UserAuthInfo; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setStoredToken(res.token);
    return res.user;
  },

  login: async (username: string, password: string) => {
    const res = await request<{ user: UserAuthInfo; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setStoredToken(res.token);
    return res.user;
  },

  logout: () => {
    setStoredToken(null);
  },

  getMe: () => request<{ user: UserAuthInfo; state: UserState }>('/user/me'),

  updateProfile: async (name: string, avatar?: string, password?: string) => {
    return request<{ user: UserAuthInfo }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar, password })
    });
  },

  claimDailyReward: () => request<{ keys: number; dailyClaimed: string }>('/user/daily-reward', {
    method: 'POST'
  }),

  buyItem: (itemId: string) => request<{ keys: number; inventory: Record<string, number> }>('/user/buy-item', {
    method: 'POST',
    body: JSON.stringify({ itemId })
  }),

  useItem: (itemId: string, charId: string) => request<{
    inventory: Record<string, number>;
    intimacy: Record<string, number>;
    charId: string;
    intimacyScore: number;
  }>('/user/use-item', {
    method: 'POST',
    body: JSON.stringify({ itemId, charId })
  }),

  unlockChar: (charId: string) => request<{ unlocked: string[]; keys: number }>(`/chars/${charId}/unlock`, {
    method: 'POST'
  }),

  toggleSaveChar: (charId: string) => request<{ saved: string[]; isSaved: boolean }>(`/chars/${charId}/save`, {
    method: 'POST'
  }),

  toggleLikeChar: (charId: string) => request<{ likes: number; isLiked: boolean }>(`/chars/${charId}/like`, {
    method: 'POST'
  }),

  viewChar: (charId: string) => request<{ views: number }>(`/chars/${charId}/view`, {
    method: 'POST'
  }),

  addComment: (charId: string, text: string) => request<{ comments: CharacterComment[] }>(`/chars/${charId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),

  replyComment: (charId: string, commentId: string, text: string) => request<{ comments: CharacterComment[] }>(`/chars/${charId}/comment/${commentId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),

  submitWebReview: (stars: number, text: string) => request<{ webReviews: WebReview[] }>('/web-reviews', {
    method: 'POST',
    body: JSON.stringify({ stars, text })
  }),

  // Admin Operations
  adminSaveChar: (charData: Partial<Character>) => request<{ char: Character; chars: Character[] }>('/admin/chars', {
    method: 'POST',
    body: JSON.stringify(charData)
  }),

  adminDeleteChar: (charId: string) => request<{ chars: Character[] }>(`/admin/chars/${charId}`, {
    method: 'DELETE'
  }),

  adminSaveItem: (itemData: Partial<ShopItem>) => request<{ item: ShopItem; items: ShopItem[] }>('/admin/items', {
    method: 'POST',
    body: JSON.stringify(itemData)
  }),

  adminDeleteItem: (itemId: string) => request<{ items: ShopItem[] }>(`/admin/items/${itemId}`, {
    method: 'DELETE'
  }),

  adminAddMusic: (musicData: Partial<MusicTrack>) => request<{ music: MusicTrack[] }>('/admin/music', {
    method: 'POST',
    body: JSON.stringify(musicData)
  }),

  adminDeleteMusic: (musicId: string) => request<{ music: MusicTrack[] }>(`/admin/music/${musicId}`, {
    method: 'DELETE'
  })
};
