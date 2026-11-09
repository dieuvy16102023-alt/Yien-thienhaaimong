import fs from 'fs';
import path from 'path';

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

export interface UserAccount {
  id: string; // username or unique uid
  username: string;
  name: string;
  passHash: string;
  avatar: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface UserInventoryItem {
  itemId: string;
  count: number;
}

export interface UserData {
  userId: string;
  keys: number;
  inventory: Record<string, number>; // itemId -> count
  intimacy: Record<string, number>;  // charId -> intimacy score
  unlocked: string[];                 // list of charIds
  saved: string[];                    // list of charIds
  liked: string[];                    // list of charIds
  dailyClaimed: string;               // YYYY-MM-DD
}

export interface DatabaseStore {
  version: number;
  lastUpdated: number;
  users: UserAccount[];
  chars: Character[];
  items: ShopItem[];
  music: MusicTrack[];
  webReviews: WebReview[];
  userStates: Record<string, UserData>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

const INITIAL_SHOP_ITEMS: ShopItem[] = [
  // 10 FOOD ITEMS (Thức ăn)
  { id: 'f1', name: 'Bánh Ngọt Ái Mộng', type: 'food', icon: '🍰', desc: 'Bánh ngọt nhẹ nhàng thơm hương dâu.', price: 3, intimacyPoints: 10 },
  { id: 'f2', name: 'Kẹo Hồ Lô Tinh Tú', type: 'food', icon: '🍡', desc: 'Những viên kẹo bọc đường lấp lánh như các chòm sao.', price: 5, intimacyPoints: 20 },
  { id: 'f3', name: 'Bánh Kem Dâu Ngân Hà', type: 'food', icon: '🎂', desc: 'Lớp kem mịn màng như dải ngân hà ngọt ngào.', price: 8, intimacyPoints: 35 },
  { id: 'f4', name: 'Mochi Đào Tiên', type: 'food', icon: '🍑', desc: 'Mochi nhân đào thanh ngọt giòn dẻo.', price: 12, intimacyPoints: 50 },
  { id: 'f5', name: 'Pudding Vũ Trụ', type: 'food', icon: '🍮', desc: 'Pudding mềm mịn lắc lư như làn sóng không trọng lực.', price: 18, intimacyPoints: 75 },
  { id: 'f6', name: 'Croissant Ánh Tinh Hà', type: 'food', icon: '🥐', desc: 'Bánh sừng bò bơ thơm giòn rụm tan trong miệng.', price: 25, intimacyPoints: 100 },
  { id: 'f7', name: 'Tart Trái Cây Hoàng Gia', type: 'food', icon: '🥧', desc: 'Bánh tart phủ đầy mâm xôi và việt quất mộng mơ.', price: 35, intimacyPoints: 150 },
  { id: 'f8', name: 'Macaron Tình Yêu', type: 'food', icon: '🧁', desc: 'Bộ bánh macaron đa sắc màu đong đầy cảm xúc.', price: 50, intimacyPoints: 220 },
  { id: 'f9', name: 'Bánh Ngàn Lớp Vũ Trụ', type: 'food', icon: '🧇', desc: 'Bánh mille-feuille phủ chocolate trắng ngàn sao.', price: 80, intimacyPoints: 350 },
  { id: 'f10', name: 'Tiệc Trà Mộng Tưởng Special', type: 'food', icon: '🫖', desc: 'Set tiệc trà hoàng gia cao cấp nhất thiên hà.', price: 120, intimacyPoints: 500 },

  // 10 DRINK ITEMS (Đồ uống)
  { id: 'd1', name: 'Trà Sữa Chân Châu Tinh Thạch', type: 'drink', icon: '🧋', desc: 'Trà sữa ngọt dịu kèm trân châu giòn sần sật.', price: 3, intimacyPoints: 10 },
  { id: 'd2', name: 'Nước Ép Đào Hồng Hạc', type: 'drink', icon: '🍹', desc: 'Nước ép đào tươi mát lạnh xua tan mệt mỏi.', price: 5, intimacyPoints: 20 },
  { id: 'd3', name: 'Soda Ngân Hà Đổi Màu', type: 'drink', icon: '🍸', desc: 'Soda sủi bọt đổi màu lấp lánh khi khuấy nhẹ.', price: 8, intimacyPoints: 35 },
  { id: 'd4', name: 'Cà Phê Băng Tuyết Vũ Trụ', type: 'drink', icon: '☕', desc: 'Ly cà phê đậm đà phủ kem tuyết béo ngậy.', price: 12, intimacyPoints: 50 },
  { id: 'd5', name: 'Trà Hoa Cúc Tinh Tú', type: 'drink', icon: '🍵', desc: 'Trà thảo mộc thanh dịu mang lại cảm giác chữa lành.', price: 18, intimacyPoints: 75 },
  { id: 'd6', name: 'Cocktail Ánh Dương', type: 'drink', icon: '🥂', desc: 'Thức uống trái cây mộng mơ lấp lánh sắc vàng.', price: 25, intimacyPoints: 100 },
  { id: 'd7', name: 'Smoothies Mơ Thủy Tinh', type: 'drink', icon: '🥤', desc: 'Sinh tố việt quất mơ tây mát lạnh ngọt ngào.', price: 35, intimacyPoints: 150 },
  { id: 'd8', name: 'Nước Thần Tinh Tú', type: 'drink', icon: '🍼', desc: 'Nước thần bí ẩn hồi phục tinh thần ngay tức thì.', price: 50, intimacyPoints: 220 },
  { id: 'd9', name: 'Rượu Sâm Panh Ngàn Sao', type: 'drink', icon: '🍾', desc: 'Sâm panh cao cấp nổ giòn giã trong ngày kỷ niệm.', price: 80, intimacyPoints: 350 },
  { id: 'd10', name: 'Nước Ép Thượng Hạng Yien', type: 'drink', icon: '🍷', desc: 'Nước ép trái cây hoàng gia bí truyền của Yien.', price: 120, intimacyPoints: 500 }
];

const SEED_DATA: DatabaseStore = {
  version: 1,
  lastUpdated: Date.now(),
  users: [
    {
      id: 'admin',
      username: 'Yien0804',
      name: 'Thiên Hà Ái Mộng - Yien',
      passHash: 'yien843',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ],
  chars: [
    {
      id: 'c1',
      name: 'Hạ Minh Châu',
      link: 'https://example.com/char-minh-chau',
      story: 'Một cô gái yêu bầu trời đêm và luôn giữ bên mình cuốn sổ ghi chép những điều chưa kịp nói.\n\nMột cuộc gặp tình cờ mở ra câu chuyện thanh xuân dịu dàng.',
      tags: ['Thanh xuân', 'Học đường'],
      locked: false,
      likes: 12,
      views: 145,
      comments: [
        {
          id: 'm1',
          userId: 'admin',
          user: 'Yien',
          text: 'Chào mừng các bạn đến với câu chuyện của Minh Châu ✦',
          date: new Date().toLocaleString('vi-VN'),
          replies: []
        }
      ]
    },
    {
      id: 'c2',
      name: 'Trần Gia Huy',
      link: 'https://example.com/char-gia-huy',
      story: 'Một chàng trai ít nói, sống cùng những bản nhạc cũ. Đằng sau vẻ ngoài bình thản là một người luôn trân trọng lời hứa.',
      tags: ['Đời thường', 'Chữa lành'],
      locked: true,
      likes: 8,
      views: 98,
      comments: []
    },
    {
      id: 'c3',
      name: 'Lâm Tinh Dã',
      link: 'https://example.com/char-tinh-da',
      story: 'Người giữ tiệm sách nhỏ ở cuối con phố. Mỗi vị khách bước vào đều mang theo một câu chuyện khác nhau.',
      tags: ['Đô thị', 'Bí ẩn nhẹ'],
      locked: false,
      likes: 15,
      views: 210,
      comments: []
    }
  ],
  items: INITIAL_SHOP_ITEMS,
  music: [
    {
      id: 'mu1',
      name: 'Giai Điệu Ngân Hà',
      artist: 'Yien Studio',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
      id: 'mu2',
      name: 'Ánh Sao Đêm Dịu Dàng',
      artist: 'Lofi Galaxy',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    }
  ],
  webReviews: [
    {
      id: 'wr1',
      userId: 'guest',
      user: 'Người Giữ Thần Thoại',
      stars: 5,
      text: 'Giao diện mộng mơ tuyệt đẹp! Rất thích cách hệ thống lưu trữ đồng bộ mượt mà.',
      date: new Date().toLocaleDateString('vi-VN')
    }
  ],
  userStates: {}
};

let memoryStore: DatabaseStore | null = null;

export function loadStore(): DatabaseStore {
  if (memoryStore) return memoryStore;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // Merge with default initial items if items count is low
      if (!parsed.items || parsed.items.length < 10) {
        parsed.items = INITIAL_SHOP_ITEMS;
      }
      memoryStore = parsed;
      return memoryStore!;
    }
  } catch (err) {
    console.error('Failed to read store.json, re-initializing:', err);
  }
  memoryStore = structuredClone(SEED_DATA);
  saveStore(memoryStore);
  return memoryStore;
}

export function saveStore(store: DatabaseStore) {
  memoryStore = store;
  store.lastUpdated = Date.now();
  store.version += 1;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write store.json:', err);
  }
}

export function getGlobalData() {
  const db = loadStore();
  return {
    version: db.version,
    lastUpdated: db.lastUpdated,
    chars: db.chars,
    items: db.items,
    music: db.music,
    webReviews: db.webReviews
  };
}

export function getUserState(userId: string): UserData {
  const db = loadStore();
  if (!db.userStates[userId]) {
    db.userStates[userId] = {
      userId,
      keys: 0,
      inventory: {},
      intimacy: {},
      unlocked: [],
      saved: [],
      liked: [],
      dailyClaimed: ''
    };
    saveStore(db);
  }
  return db.userStates[userId];
}

export function updateUserState(userId: string, updater: (state: UserData) => void): UserData {
  const db = loadStore();
  const state = getUserState(userId);
  updater(state);
  db.userStates[userId] = state;
  saveStore(db);
  return state;
}
