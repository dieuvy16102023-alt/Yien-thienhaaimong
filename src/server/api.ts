import { Router, Request, Response } from 'express';
import {
  loadStore,
  saveStore,
  getGlobalData,
  getUserState,
  updateUserState,
  Character,
  ShopItem,
  MusicTrack
} from './db';

export const apiRouter = Router();

// Middleware to parse JSON body if not handled by root express
apiRouter.use((req, _res, next) => {
  if (req.is('json') || req.headers['content-type']?.includes('application/json')) {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (data && !req.body) {
        try { req.body = JSON.parse(data); } catch { /* ignore */ }
      }
      next();
    });
  } else {
    next();
  }
});

// SSE Subscribers
const sseClients = new Set<Response>();

function notifyGlobalUpdate() {
  const globalData = getGlobalData();
  const payload = `data: ${JSON.stringify({ type: 'UPDATE_GLOBAL', data: globalData })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// SSE Stream endpoint for real-time updates
apiRouter.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial data
  res.write(`data: ${JSON.stringify({ type: 'UPDATE_GLOBAL', data: getGlobalData() })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Version endpoint
apiRouter.get('/version', (_req: Request, res: Response) => {
  const store = loadStore();
  res.json({ version: store.version, lastUpdated: store.lastUpdated });
});

// Global Data endpoint
apiRouter.get('/global', (_req: Request, res: Response) => {
  res.json(getGlobalData());
});

// Helper auth token check
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const db = loadStore();

  if (token === 'admin-token-yien843') {
    return {
      id: 'admin',
      username: 'Yien0804',
      name: db.users.find(u => u.id === 'admin')?.name || 'Thiên Hà Ái Mộng - Yien',
      role: 'admin' as const,
      avatar: db.users.find(u => u.id === 'admin')?.avatar || ''
    };
  }

  // Token is username:passHash base64 or userId
  try {
    const userId = Buffer.from(token, 'base64').toString('utf-8').split(':')[0];
    const user = db.users.find(u => u.id === userId || u.username === userId);
    if (user) {
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      };
    }
  } catch {
    // fallback
  }

  const directUser = db.users.find(u => u.id === token || u.username === token);
  if (directUser) {
    return {
      id: directUser.id,
      username: directUser.username,
      name: directUser.name,
      role: directUser.role,
      avatar: directUser.avatar
    };
  }

  return null;
}

// Authentication API
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const n = (username || '').trim();
  const p = (password || '').trim();

  if (n.length < 3 || p.length < 4) {
    return res.status(400).json({ error: 'Tên cần từ 3 ký tự, mật khẩu từ 4 ký tự.' });
  }

  const db = loadStore();
  if (n.toLowerCase() === 'yien0804' || n.toLowerCase() === 'admin' || db.users.some(u => u.username.toLowerCase() === n.toLowerCase())) {
    return res.status(400).json({ error: 'Tên đăng nhập đã được sử dụng.' });
  }

  const newUser = {
    id: n,
    username: n,
    name: n,
    passHash: p,
    avatar: '',
    role: 'user' as const,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveStore(db);

  const token = Buffer.from(`${n}:${p}`).toString('base64');
  res.json({
    user: { id: n, username: n, name: n, role: 'user', avatar: '' },
    token
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const n = (username || '').trim();
  const p = (password || '').trim();

  if (n === 'Yien0804' && p === 'yien843') {
    const db = loadStore();
    const adminObj = db.users.find(u => u.id === 'admin') || {
      id: 'admin',
      username: 'Yien0804',
      name: 'Thiên Hà Ái Mộng - Yien',
      avatar: '',
      role: 'admin'
    };

    return res.json({
      user: {
        id: 'admin',
        username: 'Yien0804',
        name: adminObj.name,
        role: 'admin',
        avatar: adminObj.avatar
      },
      token: 'admin-token-yien843'
    });
  }

  const db = loadStore();
  const u = db.users.find(x => (x.username.toLowerCase() === n.toLowerCase() || x.name.toLowerCase() === n.toLowerCase()) && x.passHash === p);
  if (!u) {
    return res.status(400).json({ error: 'Thông tin đăng nhập chưa đúng.' });
  }

  const token = Buffer.from(`${u.username}:${u.passHash}`).toString('base64');
  res.json({
    user: { id: u.id, username: u.username, name: u.name, role: u.role, avatar: u.avatar },
    token
  });
});

// User State Endpoint
apiRouter.get('/user/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const state = getUserState(user.id);
  res.json({ user, state });
});

apiRouter.put('/user/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const { name, avatar, password } = req.body || {};
  const displayName = (name || '').trim();
  const avatarUrl = (avatar || '').trim();

  if (!displayName) {
    return res.status(400).json({ error: 'Tên hiển thị không được để trống.' });
  }
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    return res.status(400).json({ error: 'Link avatar phải bắt đầu bằng http:// hoặc https://' });
  }

  const db = loadStore();
  const dbUser = db.users.find(u => u.id === user.id);
  if (dbUser) {
    dbUser.name = displayName;
    dbUser.avatar = avatarUrl;
    if (password && password.trim().length >= 4) {
      dbUser.passHash = password.trim();
    }
    saveStore(db);
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      name: displayName,
      role: user.role,
      avatar: avatarUrl
    }
  });
});

// Daily Reward
apiRouter.post('/user/daily-reward', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const today = new Date().toISOString().slice(0, 10);
  let state = getUserState(user.id);

  if (state.dailyClaimed === today) {
    return res.status(400).json({ error: 'Bạn đã nhận quà hôm nay rồi.' });
  }

  state = updateUserState(user.id, s => {
    s.dailyClaimed = today;
    s.keys = (s.keys || 0) + 2;
  });

  res.json({ keys: state.keys, dailyClaimed: state.dailyClaimed });
});

// Buy Shop Item
apiRouter.post('/user/buy-item', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const { itemId } = req.body || {};
  const db = loadStore();
  const item = db.items.find(i => i.id === itemId);

  if (!item) return res.status(404).json({ error: 'Vật phẩm không tồn tại.' });

  let state = getUserState(user.id);
  if ((state.keys || 0) < item.price) {
    return res.status(400).json({ error: 'Bạn chưa đủ chìa khóa.' });
  }

  state = updateUserState(user.id, s => {
    s.keys = (s.keys || 0) - item.price;
    s.inventory[itemId] = (s.inventory[itemId] || 0) + 1;
  });

  res.json({ keys: state.keys, inventory: state.inventory });
});

// Use Item on Character (Feeding/Drinking Intimacy)
apiRouter.post('/user/use-item', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const { itemId, charId } = req.body || {};
  const db = loadStore();
  const item = db.items.find(i => i.id === itemId);
  const character = db.chars.find(c => c.id === charId);

  if (!item || !character) {
    return res.status(404).json({ error: 'Vật phẩm hoặc nhân vật không tồn tại.' });
  }

  let state = getUserState(user.id);
  const currentCount = state.inventory[itemId] || 0;

  if (currentCount <= 0) {
    return res.status(400).json({ error: 'Bạn không sở hữu vật phẩm này trong túi đồ!' });
  }

  state = updateUserState(user.id, s => {
    s.inventory[itemId] = Math.max(0, (s.inventory[itemId] || 0) - 1);
    s.intimacy[charId] = (s.intimacy[charId] || 0) + item.intimacyPoints;
  });

  res.json({
    inventory: state.inventory,
    intimacy: state.intimacy,
    charId,
    intimacyScore: state.intimacy[charId]
  });
});

// Unlock Character
apiRouter.post('/chars/:id/unlock', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const charId = req.params.id;
  const db = loadStore();
  const character = db.chars.find(c => c.id === charId);
  if (!character) return res.status(404).json({ error: 'Nhân vật không tồn tại.' });

  let state = getUserState(user.id);
  if (state.unlocked.includes(charId)) {
    return res.json({ unlocked: state.unlocked, keys: state.keys });
  }

  if (state.keys < 5) {
    return res.status(400).json({ error: 'Cần 5 chìa khóa để mở nhân vật.' });
  }

  state = updateUserState(user.id, s => {
    s.keys -= 5;
    if (!s.unlocked.includes(charId)) s.unlocked.push(charId);
  });

  res.json({ unlocked: state.unlocked, keys: state.keys });
});

// Save Character
apiRouter.post('/chars/:id/save', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const charId = req.params.id;
  let isSaved = false;
  const state = updateUserState(user.id, s => {
    const idx = s.saved.indexOf(charId);
    if (idx >= 0) {
      s.saved.splice(idx, 1);
      isSaved = false;
    } else {
      s.saved.push(charId);
      isSaved = true;
    }
  });

  res.json({ saved: state.saved, isSaved });
});

// Like Character
apiRouter.post('/chars/:id/like', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const charId = req.params.id;
  const db = loadStore();
  const character = db.chars.find(c => c.id === charId);
  if (!character) return res.status(404).json({ error: 'Nhân vật không tồn tại' });

  let isLiked = false;
  updateUserState(user.id, s => {
    const idx = s.liked.indexOf(charId);
    if (idx >= 0) {
      s.liked.splice(idx, 1);
      character.likes = Math.max(0, (character.likes || 0) - 1);
      isLiked = false;
    } else {
      s.liked.push(charId);
      character.likes = (character.likes || 0) + 1;
      isLiked = true;
    }
  });

  saveStore(db);
  notifyGlobalUpdate();

  res.json({ likes: character.likes, isLiked });
});

// View Character (Increment view counter safely)
apiRouter.post('/chars/:id/view', (req: Request, res: Response) => {
  const charId = req.params.id;
  const db = loadStore();
  const character = db.chars.find(c => c.id === charId);
  if (character) {
    character.views = (character.views || 0) + 1;
    saveStore(db);
    notifyGlobalUpdate();
  }
  res.json({ views: character?.views || 0 });
});

// Add Comment
apiRouter.post('/chars/:id/comment', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const charId = req.params.id;
  const { text } = req.body || {};
  const t = (text || '').trim();
  if (!t) return res.status(400).json({ error: 'Nội dung bình luận không được để trống.' });

  const db = loadStore();
  const character = db.chars.find(c => c.id === charId);
  if (!character) return res.status(404).json({ error: 'Nhân vật không tồn tại' });

  const newComment = {
    id: 'm' + Date.now(),
    userId: user.id,
    user: user.name,
    avatar: user.avatar,
    text: t,
    date: new Date().toLocaleString('vi-VN'),
    replies: []
  };

  character.comments.push(newComment);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ comments: character.comments });
});

// Reply Comment
apiRouter.post('/chars/:id/comment/:commentId/reply', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const { id: charId, commentId } = req.params;
  const { text } = req.body || {};
  const t = (text || '').trim();
  if (!t) return res.status(400).json({ error: 'Nội dung trả lời không được để trống.' });

  const db = loadStore();
  const character = db.chars.find(c => c.id === charId);
  const comment = character?.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Bình luận không tồn tại' });

  comment.replies.push({
    id: 'r' + Date.now(),
    userId: user.id,
    user: user.name,
    avatar: user.avatar,
    text: t,
    date: new Date().toLocaleString('vi-VN')
  });

  saveStore(db);
  notifyGlobalUpdate();

  res.json({ comments: character!.comments });
});

// Submit Web Review
apiRouter.post('/web-reviews', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const { stars, text } = req.body || {};
  const t = (text || '').trim();
  if (!t) return res.status(400).json({ error: 'Hãy nhập nội dung cảm nhận.' });

  const db = loadStore();
  const newReview = {
    id: 'wr' + Date.now(),
    userId: user.id,
    user: user.name,
    avatar: user.avatar,
    stars: Number(stars) || 5,
    text: t,
    date: new Date().toLocaleDateString('vi-VN')
  };

  db.webReviews.unshift(newReview);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ webReviews: db.webReviews });
});

// ADMIN ROUTES (Strict Role check)
function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản ADMIN mới có quyền thao tác dữ liệu global.' });
  }
  next();
}

// Admin Save Character
apiRouter.post('/admin/chars', requireAdmin, (req: Request, res: Response) => {
  const { id, name, link, story, tags, locked, passphrase } = req.body || {};
  const charName = (name || '').trim();
  const charStory = (story || '').trim();
  const charLink = (link || '').trim();

  if (!charName || !charStory) {
    return res.status(400).json({ error: 'Cần nhập tên và cốt truyện nhân vật.' });
  }
  if (charLink && !/^https?:\/\//i.test(charLink)) {
    return res.status(400).json({ error: 'Link nhân vật phải bắt đầu bằng http:// hoặc https://' });
  }

  const db = loadStore();
  const charId = id || 'c' + Date.now();
  const existingIdx = db.chars.findIndex(c => c.id === charId);

  const updatedChar: Character = {
    id: charId,
    name: charName,
    link: charLink,
    story: charStory,
    tags: Array.isArray(tags) ? tags : (tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
    locked: Boolean(locked),
    passphrase: passphrase ? String(passphrase).trim() : undefined,
    likes: existingIdx >= 0 ? db.chars[existingIdx].likes : 0,
    views: existingIdx >= 0 ? db.chars[existingIdx].views : 0,
    comments: existingIdx >= 0 ? db.chars[existingIdx].comments : []
  };

  if (existingIdx >= 0) {
    db.chars[existingIdx] = updatedChar;
  } else {
    db.chars.push(updatedChar);
  }

  saveStore(db);
  notifyGlobalUpdate();

  res.json({ char: updatedChar, chars: db.chars });
});

// Admin Delete Character
apiRouter.delete('/admin/chars/:id', requireAdmin, (req: Request, res: Response) => {
  const charId = req.params.id;
  const db = loadStore();
  db.chars = db.chars.filter(c => c.id !== charId);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ chars: db.chars });
});

// Admin Save Shop Item
apiRouter.post('/admin/items', requireAdmin, (req: Request, res: Response) => {
  const { id, name, type, icon, desc, price, intimacyPoints } = req.body || {};
  const itemName = (name || '').trim();
  const itemPrice = Number(price);

  if (!itemName || !Number.isFinite(itemPrice) || itemPrice < 0) {
    return res.status(400).json({ error: 'Kiểm tra tên và giá vật phẩm.' });
  }

  const db = loadStore();
  const itemId = id || 'i' + Date.now();
  const existingIdx = db.items.findIndex(i => i.id === itemId);

  const updatedItem: ShopItem = {
    id: itemId,
    name: itemName,
    type: type === 'drink' ? 'drink' : 'food',
    icon: icon || (type === 'drink' ? '🥤' : '🍰'),
    desc: (desc || '').trim(),
    price: itemPrice,
    intimacyPoints: Number(intimacyPoints) || Math.max(10, itemPrice * 4)
  };

  if (existingIdx >= 0) {
    db.items[existingIdx] = updatedItem;
  } else {
    db.items.push(updatedItem);
  }

  saveStore(db);
  notifyGlobalUpdate();

  res.json({ item: updatedItem, items: db.items });
});

// Admin Delete Shop Item
apiRouter.delete('/admin/items/:id', requireAdmin, (req: Request, res: Response) => {
  const itemId = req.params.id;
  const db = loadStore();
  db.items = db.items.filter(i => i.id !== itemId);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ items: db.items });
});

// Admin Save Music
apiRouter.post('/admin/music', requireAdmin, (req: Request, res: Response) => {
  const { name, artist, url } = req.body || {};
  const musicName = (name || '').trim();
  const musicUrl = (url || '').trim();

  if (!musicName || !musicUrl) {
    return res.status(400).json({ error: 'Nhập tên bài nhạc và đường dẫn.' });
  }
  if (!/^https?:\/\//i.test(musicUrl)) {
    return res.status(400).json({ error: 'Đường dẫn phải bắt đầu bằng http:// hoặc https://' });
  }

  const db = loadStore();
  const newMusic: MusicTrack = {
    id: 'mu' + Date.now(),
    name: musicName,
    artist: (artist || '').trim(),
    url: musicUrl
  };

  db.music.push(newMusic);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ music: db.music });
});

// Admin Delete Music
apiRouter.delete('/admin/music/:id', requireAdmin, (req: Request, res: Response) => {
  const musicId = req.params.id;
  const db = loadStore();
  db.music = db.music.filter(m => m.id !== musicId);
  saveStore(db);
  notifyGlobalUpdate();

  res.json({ music: db.music });
});
