import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  api,
  GlobalData,
  UserAuthInfo,
  UserState,
  Character,
  ShopItem,
  MusicTrack,
  WebReview
} from './lib/api';

// Safe Escaping & URL Helper
function safeUrl(url?: string): string {
  if (!url) return '#';
  try {
    const u = new URL(url);
    if (['http:', 'https:'].includes(u.protocol)) {
      return u.href;
    }
    return '#';
  } catch {
    return '#';
  }
}

function ytEmbed(url: string): string {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    }
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
  } catch {
    return '';
  }
}

export default function App() {
  // Navigation Screens
  const [screen, setScreen] = useState<'welcome' | 'gate' | 'hall'>('welcome');
  const [activeTab, setActiveTab] = useState<'home' | 'saved' | 'game' | 'store' | 'reviews' | 'music' | 'profile' | 'admin'>('home');

  // Auth & State
  const [user, setUser] = useState<UserAuthInfo | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [globalData, setGlobalData] = useState<GlobalData>({
    version: 0,
    lastUpdated: 0,
    chars: [],
    items: [],
    music: [],
    webReviews: []
  });

  // UI Modals & Notifications
  const [toast, setToast] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [feedModalCharId, setFeedModalCharId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'locked'>('all');
  const [shopCategory, setShopCategory] = useState<'all' | 'food' | 'drink'>('all');

  // Forms State
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Admin Char Form
  const [editCharId, setEditCharId] = useState('');
  const [cName, setCName] = useState('');
  const [cRating, setCRating] = useState('Phù hợp mọi lứa tuổi');
  const [cLink, setCLink] = useState('');
  const [cStory, setCStory] = useState('');
  const [cTags, setCTags] = useState('');
  const [cLocked, setCLocked] = useState(false);
  const [cPass, setCPass] = useState('');

  // Admin Shop Item Form
  const [editItemId, setEditItemId] = useState('');
  const [iName, setIName] = useState('');
  const [iType, setIType] = useState<'food' | 'drink'>('food');
  const [iIcon, setIIcon] = useState('🍰');
  const [iDesc, setIDesc] = useState('');
  const [iPrice, setIPrice] = useState(5);
  const [iIntimacy, setIIntimacy] = useState(20);

  // Admin Music Form
  const [mName, setMName] = useState('');
  const [mArtist, setMArtist] = useState('');
  const [mUrl, setMUrl] = useState('');

  // Comments & Reviews Form
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [webReviewStars, setWebReviewStars] = useState(5);
  const [webReviewText, setWebReviewText] = useState('');

  // Profile Form
  const [pDisplay, setPDisplay] = useState('');
  const [pAvatar, setPAvatar] = useState('');
  const [pPassword, setPPassword] = useState('');

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Fetch Initial Data & Setup Realtime Sync
  const loadGlobal = useCallback(async () => {
    try {
      const data = await api.getGlobalData();
      setGlobalData(data);
    } catch (err: any) {
      console.error('Failed to load global data:', err);
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setUserState(res.state);
      setPDisplay(res.user.name);
      setPAvatar(res.user.avatar || '');
    } catch {
      // Not logged in or expired
      setUser(null);
      setUserState(null);
    }
  }, []);

  useEffect(() => {
    loadGlobal();
    loadMe();

    // Subscribe to SSE Real-time global updates!
    const unsubscribe = api.subscribeGlobalData((updated) => {
      setGlobalData(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [loadGlobal, loadMe]);

  // Handle Auth Action Requirement
  const authRequired = useCallback(() => {
    if (!user) {
      setAuthModalOpen(true);
      return false;
    }
    return true;
  }, [user]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      const u = await api.login(authUsername, authPassword);
      setUser(u);
      setAuthModalOpen(false);
      setAuthUsername('');
      setAuthPassword('');
      showToast(`Xin chào ${u.name}!`);
      await loadMe();
    } catch (err: any) {
      showToast(err.message || 'Đăng nhập thất bại.');
    }
  };

  const handleRegister = async () => {
    try {
      const u = await api.register(authUsername, authPassword);
      setUser(u);
      setAuthModalOpen(false);
      setAuthUsername('');
      setAuthPassword('');
      showToast('Tạo tài khoản thành công!');
      await loadMe();
    } catch (err: any) {
      showToast(err.message || 'Đăng ký thất bại.');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setUserState(null);
    setActiveTab('home');
    showToast('Đã đăng xuất.');
  };

  // Actions
  const handleDailyReward = async () => {
    if (!authRequired()) return;
    try {
      const res = await api.claimDailyReward();
      setUserState(prev => prev ? { ...prev, keys: res.keys, dailyClaimed: res.dailyClaimed } : null);
      showToast('Bạn nhận được 2 chìa khóa miễn phí! 🗝️');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleBuyItem = async (itemId: string) => {
    if (!authRequired()) return;
    try {
      const res = await api.buyItem(itemId);
      setUserState(prev => prev ? { ...prev, keys: res.keys, inventory: res.inventory } : null);
      showToast('Đổi vật phẩm thành công! Đã thêm vào túi đồ.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleUseItemOnChar = async (itemId: string, charId: string) => {
    if (!authRequired()) return;
    try {
      const res = await api.useItem(itemId, charId);
      setUserState(prev => prev ? { ...prev, inventory: res.inventory, intimacy: res.intimacy } : null);
      const itemObj = globalData.items.find(i => i.id === itemId);
      showToast(`Đã dùng ${itemObj?.name || 'món đồ'}! Thân mật +${itemObj?.intimacyPoints || 0} 💖`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleToggleLike = async (charId: string) => {
    if (!authRequired()) return;
    try {
      const res = await api.toggleLikeChar(charId);
      setUserState(prev => {
        if (!prev) return null;
        const newLiked = res.isLiked ? [...prev.liked, charId] : prev.liked.filter(id => id !== charId);
        return { ...prev, liked: newLiked };
      });
      showToast(res.isLiked ? 'Đã thả tim nhân vật! ♥' : 'Đã bỏ tim.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleToggleSave = async (charId: string) => {
    if (!authRequired()) return;
    try {
      const res = await api.toggleSaveChar(charId);
      setUserState(prev => prev ? { ...prev, saved: res.saved } : null);
      showToast(res.isSaved ? 'Đã lưu nhân vật vào danh sách! ☆' : 'Đã bỏ lưu.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleOpenCharDetail = async (char: Character) => {
    const isUnlocked = !char.locked || (userState && userState.unlocked.includes(char.id));

    if (char.passphrase && !isUnlocked) {
      const entered = prompt('Nhân vật này có mật khẩu riêng. Nhập mật khẩu để tiếp tục:');
      if (entered !== char.passphrase) {
        showToast('Mật khẩu chưa đúng.');
        return;
      }
    }

    if (!isUnlocked) {
      if (!authRequired()) return;
      if ((userState?.keys || 0) < 5) {
        showToast('Cần 5 chìa khóa để mở nhân vật này.');
        return;
      }
      try {
        const res = await api.unlockChar(char.id);
        setUserState(prev => prev ? { ...prev, keys: res.keys, unlocked: res.unlocked } : null);
        showToast('Đã mở khóa nhân vật thành công! 🗝️');
      } catch (err: any) {
        showToast(err.message);
        return;
      }
    }

    // Register view count
    api.viewChar(char.id).catch(() => {});
    setSelectedCharId(char.id);
  };

  const handleAddComment = async (charId: string) => {
    if (!authRequired()) return;
    if (!newCommentText.trim()) return showToast('Bạn chưa nhập nội dung bình luận.');
    try {
      await api.addComment(charId, newCommentText);
      setNewCommentText('');
      showToast('Đã gửi bình luận.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleReplyComment = async (charId: string, commentId: string) => {
    if (!authRequired()) return;
    if (!replyText.trim()) return showToast('Nội dung trả lời không được để trống.');
    try {
      await api.replyComment(charId, commentId, replyText);
      setReplyText('');
      setReplyTargetId(null);
      showToast('Đã trả lời bình luận.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSubmitWebReview = async () => {
    if (!authRequired()) return;
    if (!webReviewText.trim()) return showToast('Hãy viết cảm nhận của bạn.');
    try {
      await api.submitWebReview(webReviewStars, webReviewText);
      setWebReviewText('');
      showToast('Cảm ơn bạn đã gửi đánh giá! ✦');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!authRequired()) return;
    try {
      const res = await api.updateProfile(pDisplay, pAvatar, pPassword);
      setUser(res.user);
      setPPassword('');
      showToast('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Admin Actions
  const clearCharForm = () => {
    setEditCharId('');
    setCName('');
    setCLink('');
    setCStory('');
    setCTags('');
    setCLocked(false);
    setCPass('');
  };

  const handleAdminSaveChar = async () => {
    if (user?.role !== 'admin') return;
    try {
      await api.adminSaveChar({
        id: editCharId || undefined,
        name: cName,
        link: cLink,
        story: cStory,
        tags: cTags.split(',').map(t => t.trim()).filter(Boolean),
        locked: cLocked,
        passphrase: cPass
      });
      clearCharForm();
      showToast('Đã lưu nhân vật vào database chung!');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleAdminEditChar = (char: Character) => {
    setEditCharId(char.id);
    setCName(char.name);
    setCLink(char.link);
    setCStory(char.story);
    setCTags(char.tags.join(', '));
    setCLocked(char.locked);
    setCPass(char.passphrase || '');
  };

  const handleAdminDeleteChar = async (charId: string) => {
    if (user?.role !== 'admin' || !confirm('Xóa nhân vật này khỏi hệ thống?')) return;
    try {
      await api.adminDeleteChar(charId);
      showToast('Đã xóa nhân vật.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const clearItemForm = () => {
    setEditItemId('');
    setIName('');
    setIType('food');
    setIIcon('🍰');
    setIDesc('');
    setIPrice(5);
    setIIntimacy(20);
  };

  const handleAdminSaveItem = async () => {
    if (user?.role !== 'admin') return;
    try {
      await api.adminSaveItem({
        id: editItemId || undefined,
        name: iName,
        type: iType,
        icon: iIcon,
        desc: iDesc,
        price: iPrice,
        intimacyPoints: iIntimacy
      });
      clearItemForm();
      showToast('Đã lưu vật phẩm cửa hàng!');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleAdminEditItem = (item: ShopItem) => {
    setEditItemId(item.id);
    setIName(item.name);
    setIType(item.type);
    setIIcon(item.icon);
    setIDesc(item.desc);
    setIPrice(item.price);
    setIIntimacy(item.intimacyPoints);
  };

  const handleAdminDeleteItem = async (itemId: string) => {
    if (user?.role !== 'admin' || !confirm('Xóa vật phẩm này?')) return;
    try {
      await api.adminDeleteItem(itemId);
      showToast('Đã xóa vật phẩm.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleAdminAddMusic = async () => {
    if (user?.role !== 'admin') return;
    try {
      await api.adminAddMusic({ name: mName, artist: mArtist, url: mUrl });
      setMName('');
      setMArtist('');
      setMUrl('');
      showToast('Đã thêm bài nhạc!');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleAdminDeleteMusic = async (musicId: string) => {
    if (user?.role !== 'admin' || !confirm('Xóa bài nhạc này?')) return;
    try {
      await api.adminDeleteMusic(musicId);
      showToast('Đã xóa nhạc.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Filtered Lists
  const filteredChars = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return globalData.chars.filter(c => {
      const matchFilter = filterType === 'all' ? true : filterType === 'locked' ? c.locked : !c.locked;
      const matchQuery = [c.name, c.story, ...c.tags].join(' ').toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [globalData.chars, searchQuery, filterType]);

  const savedChars = useMemo(() => {
    if (!userState) return [];
    return globalData.chars.filter(c => userState.saved.includes(c.id));
  }, [globalData.chars, userState]);

  const filteredShopItems = useMemo(() => {
    if (shopCategory === 'all') return globalData.items;
    return globalData.items.filter(i => i.type === shopCategory);
  }, [globalData.items, shopCategory]);

  const selectedCharObj = useMemo(() => {
    return globalData.chars.find(c => c.id === selectedCharId);
  }, [globalData.chars, selectedCharId]);

  const feedCharObj = useMemo(() => {
    return globalData.chars.find(c => c.id === feedModalCharId);
  }, [globalData.chars, feedModalCharId]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isDailyClaimedToday = userState?.dailyClaimed === todayStr;

  return (
    <div className="bg-[radial-gradient(ellipse_at_15%_0%,#30234b_0,transparent_38%),radial-gradient(ellipse_at_90%_30%,#28234a_0,transparent_35%),#100e20] text-[#f6f1ff] min-h-screen font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#f4d48b] text-[#21182c] px-6 py-3 rounded-full z-50 font-bold shadow-2xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Screen 1: Welcome Screen */}
      {screen === 'welcome' && (
        <section className="min-h-screen grid place-items-center p-6">
          <div className="w-full max-w-[760px] text-center p-8 md:p-14 border border-[#5c4b75] rounded-[28px] bg-gradient-to-br from-[#211a38ef] to-[#151326f5] shadow-2xl relative overflow-hidden">
            <div className="absolute top-3 left-5 text-[#e7c8f2] tracking-[15px] opacity-60 text-xs">
              ✦  ·  ✧       ·      ✦
            </div>
            <div className="tracking-[5px] uppercase text-[#f4d48b] text-xs font-semibold mt-4">
              A little universe made of stories
            </div>
            <h1 className="font-serif text-4xl md:text-6xl my-4 text-[#f6d7ec] drop-shadow-[0_0_35px_#d78fca66]">
              Thiên Hà Ái Mộng
            </h1>
            <div className="text-[#b8afcf] text-lg mb-2">— Yien —</div>
            <div className="text-[#f4d48b] tracking-[8px] my-6">✦ ✧ ⋆ ✧ ✦</div>
            <p className="text-[#f6f1ff] text-lg mb-2">Chào mọi người đã đến với Thiên Hà của mình.</p>
            <p className="text-[#b8afcf] text-sm mb-8">Nơi những nhân vật và câu chuyện tìm thấy một vì sao riêng.</p>
            <button
              onClick={() => setScreen('gate')}
              className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-extrabold px-8 py-3.5 rounded-xl text-base hover:scale-105 transition-all shadow-lg"
            >
              Bước vào thiên hà ✦
            </button>
          </div>
        </section>
      )}

      {/* Screen 2: Age Gate */}
      {screen === 'gate' && (
        <section className="min-h-screen grid place-items-center p-6">
          <div className="w-full max-w-[760px] text-center p-8 md:p-14 border border-[#5c4b75] rounded-[28px] bg-gradient-to-br from-[#211a38ef] to-[#151326f5] shadow-2xl relative overflow-hidden">
            <div className="tracking-[5px] uppercase text-[#f4d48b] text-xs font-semibold mb-2">
              A gentle reminder
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-[#f3cce4] mb-4">Trước khi vào sảnh...</h2>
            <p className="text-[#b8afcf] max-w-[530px] mx-auto text-sm leading-relaxed mb-8">
              Bạn đủ 18 tuổi chưa? Nếu chưa, hãy khám phá những nhân vật phù hợp với lứa tuổi của mình nhé. Thiên Hà Ái Mộng chỉ hiển thị nội dung an toàn, phù hợp với mọi lứa tuổi trong phiên bản này.
            </p>
            <button
              onClick={() => setScreen('hall')}
              className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-extrabold px-8 py-3.5 rounded-xl text-base hover:scale-105 transition-all shadow-lg mb-4"
            >
              Mình đã hiểu · Vào sảnh char
            </button>
            <p className="text-[#b8afcf] text-xs opacity-75">Không yêu cầu cung cấp ngày sinh hay giấy tờ cá nhân.</p>
          </div>
        </section>
      )}

      {/* Screen 3: Main Hall App */}
      {screen === 'hall' && (
        <main className="max-w-[1240px] mx-auto px-4 py-5">
          
          {/* Topbar */}
          <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#393252]">
            <div className="font-serif text-2xl md:text-3xl text-[#f2cce7]">
              Thiên Hà Ái Mộng
              <small className="block font-sans text-[11px] tracking-[3px] text-[#f4d48b] mt-0.5 uppercase">
                Y I E N · STORY UNIVERSE
              </small>
            </div>
            
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="border border-[#393252] rounded-full px-3.5 py-1.5 text-[#b8afcf] text-xs md:text-sm flex items-center gap-1.5 bg-[#1b1831]">
                {user?.avatar ? (
                  <img src={safeUrl(user.avatar)} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span>✦</span>
                )}
                <span>{user ? user.name : 'Khách ghé thăm'}</span>
                {user?.role === 'admin' && (
                  <span className="bg-[#ef9bc7] text-[#100e20] text-[10px] font-extrabold px-1.5 py-0.5 rounded ml-1">
                    CRT ADMIN
                  </span>
                )}
              </span>

              <span className="border border-[#393252] rounded-full px-3.5 py-1.5 text-[#b8afcf] text-xs md:text-sm bg-[#1b1831]">
                🗝️ <b className="text-[#f4d48b] font-bold">{userState ? userState.keys : 0}</b> chìa khóa
              </span>

              {!user ? (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-gradient-to-r from-[#41335f] to-[#2b2547] border border-[#393252] hover:border-[#ef9bc7] text-white px-4 py-2 rounded-xl text-sm transition-all"
                >
                  Đăng nhập
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="bg-[#2a2543] border border-[#393252] hover:border-[#ff9baf] text-[#ffd9df] px-4 py-2 rounded-xl text-sm transition-all"
                >
                  Đăng xuất
                </button>
              )}
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 flex-wrap my-4">
            {[
              { id: 'home', label: 'Sảnh char' },
              { id: 'saved', label: 'Char đã lưu' },
              { id: 'game', label: 'Trò chơi' },
              { id: 'store', label: 'Cửa hàng' },
              { id: 'reviews', label: 'Đánh giá web' },
              { id: 'music', label: 'Âm nhạc' },
              { id: 'profile', label: 'Tài khoản' },
              ...(user?.role === 'admin' ? [{ id: 'admin', label: '⚙️ Quản trị' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                  activeTab === tab.id
                    ? 'bg-[#59436e] border-[#ef9bc7] text-white font-semibold'
                    : 'bg-[#1b1831] border-[#393252] text-[#b8afcf] hover:text-white hover:border-[#aa9aff]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* TAB 1: Sảnh Char (Home) */}
          {activeTab === 'home' && (
            <section className="space-y-5">
              <div className="p-6 md:p-8 border border-[#393252] rounded-2xl bg-gradient-to-r from-[#322447] to-[#1d1a34]">
                <h1 className="font-serif text-2xl md:text-4xl text-[#f6f1ff] mb-2">Chào mừng đến với Thiên Hà ✧</h1>
                <p className="text-[#b8afcf] text-sm md:text-base">Mỗi nhân vật là một thế giới nhỏ. Hãy tìm câu chuyện dành cho bạn.</p>
              </div>

              <div className="flex gap-3 flex-wrap items-center">
                <input
                  type="text"
                  placeholder="Tìm tên char, tag, cốt truyện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl px-4 py-2.5 outline-none focus:border-[#ef9bc7]"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl px-4 py-2.5 outline-none focus:border-[#ef9bc7] max-w-[180px]"
                >
                  <option value="all">Tất cả nhân vật</option>
                  <option value="free">Không khóa</option>
                  <option value="locked">Cần chìa khóa</option>
                </select>
              </div>

              {filteredChars.length === 0 ? (
                <div className="text-center py-12 text-[#b8afcf] border border-dashed border-[#393252] rounded-2xl">
                  Chưa tìm thấy nhân vật phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredChars.map(c => {
                    const isUnlocked = !c.locked || (userState && userState.unlocked.includes(c.id));
                    const isLiked = userState && userState.liked.includes(c.id);
                    const isSaved = userState && userState.saved.includes(c.id);
                    const intimacy = userState?.intimacy[c.id] || 0;

                    return (
                      <article key={c.id} className="bg-gradient-to-b from-[#211d38] to-[#19162d] border border-[#393252] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-[#aa9aff] transition-all">
                        <div>
                          <div className="h-32 bg-[radial-gradient(circle_at_30%_30%,#8966a7,#342747_45%,#17152a)] flex items-center justify-center text-4xl text-[#f6d5e9] relative">
                            ✧
                            {c.locked && !isUnlocked && (
                              <span className="absolute top-3 right-3 bg-[#100e20]/80 text-[#f4d48b] px-2.5 py-1 rounded-full text-xs border border-[#393252]">
                                🔒 5 chìa khóa
                              </span>
                            )}
                            {intimacy > 0 && (
                              <span className="absolute bottom-2 left-3 bg-[#342747]/90 text-[#ef9bc7] px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#59436e]">
                                💖 Thân mật: {intimacy}
                              </span>
                            )}
                          </div>
                          
                          <div className="p-4 space-y-2">
                            <h3 className="font-serif text-xl text-[#f6f1ff]">{c.name}</h3>
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map(t => (
                                <span key={t} className="bg-[#342c4b] text-[#e7c9e9] text-[11px] px-2 py-0.5 rounded-full">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <p className="text-[#b8afcf] text-xs line-clamp-3 leading-relaxed">
                              {c.story}
                            </p>
                            <div className="text-[#b8afcf] text-[12px] pt-1">
                              ♡ {c.likes || 0} tim · {c.views || 0} xem · {c.comments.length} bình luận
                            </div>
                          </div>
                        </div>

                        <div className="p-4 pt-0 space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenCharDetail(c)}
                              className="flex-1 bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold py-2 rounded-xl text-xs hover:opacity-90 transition-all"
                            >
                              {isUnlocked ? 'Xem chi tiết' : '🗝️ Mở char'}
                            </button>
                            {user && isUnlocked && (
                              <button
                                onClick={() => setFeedModalCharId(c.id)}
                                className="bg-[#322447] border border-[#ef9bc7] text-[#f4d48b] px-3 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all"
                                title="Cho nhân vật ăn/uống từ túi đồ"
                              >
                                🍰 Cho ăn
                              </button>
                            )}
                          </div>
                          
                          <div className="flex gap-2 text-xs">
                            <button
                              onClick={() => handleToggleSave(c.id)}
                              className={`flex-1 py-1.5 rounded-xl border transition-all ${
                                isSaved ? 'bg-[#59436e] border-[#ef9bc7] text-white' : 'bg-[#100e20] border-[#393252] text-[#b8afcf]'
                              }`}
                            >
                              {isSaved ? '★ Đã lưu' : '☆ Lưu'}
                            </button>
                            <button
                              onClick={() => handleToggleLike(c.id)}
                              className={`flex-1 py-1.5 rounded-xl border transition-all ${
                                isLiked ? 'bg-[#59436e] border-[#ff9baf] text-[#ff9baf]' : 'bg-[#100e20] border-[#393252] text-[#b8afcf]'
                              }`}
                            >
                              {isLiked ? '♥ Thả tim' : '♡ Tim'}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: Char đã lưu (Saved) */}
          {activeTab === 'saved' && (
            <section className="space-y-4">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Những vì sao đã lưu</h2>
              {!user ? (
                <div className="text-center py-12 text-[#b8afcf] border border-dashed border-[#393252] rounded-2xl">
                  Đăng nhập để xem danh sách nhân vật đã lưu của bạn.
                </div>
              ) : savedChars.length === 0 ? (
                <div className="text-center py-12 text-[#b8afcf] border border-dashed border-[#393252] rounded-2xl">
                  Bạn chưa lưu nhân vật nào. Hãy khám phá tại Sảnh char!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedChars.map(c => (
                    <article key={c.id} className="bg-gradient-to-b from-[#211d38] to-[#19162d] border border-[#393252] rounded-2xl p-4 space-y-3">
                      <h3 className="font-serif text-xl text-[#f6f1ff]">{c.name}</h3>
                      <p className="text-[#b8afcf] text-xs line-clamp-2">{c.story}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenCharDetail(c)}
                          className="flex-1 bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold py-1.5 rounded-xl text-xs"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => handleToggleSave(c.id)}
                          className="bg-[#2a2441] border border-[#393252] text-[#ffd9df] px-3 py-1.5 rounded-xl text-xs"
                        >
                          Bỏ lưu
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: Trò chơi (Game) */}
          {activeTab === 'game' && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Trò chơi · Săn chìa khóa</h2>
              
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold text-[#f4d48b]">✨ Thử vận may của bạn</h3>
                <p className="text-[#b8afcf] text-sm">
                  Mỗi ngày bạn có thể nhận 2 chìa khóa miễn phí một lần. Dùng chìa khóa để mở nhân vật mới hoặc mua thức ăn, đồ uống tăng điểm thân mật!
                </p>
                
                <button
                  onClick={handleDailyReward}
                  disabled={!user || isDailyClaimedToday}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                    !user || isDailyClaimedToday
                      ? 'bg-[#2a2543] text-[#b8afcf] border border-[#393252] opacity-60 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] hover:scale-105 shadow-md'
                  }`}
                >
                  {!user
                    ? 'Đăng nhập để nhận quà'
                    : isDailyClaimedToday
                    ? 'Đã nhận quà hôm nay'
                    : 'Nhận 2 chìa khóa miễn phí hôm nay'}
                </button>

                <div className="flex gap-4 pt-4 border-t border-[#393252]/60 flex-wrap">
                  <div className="bg-[#2a2441] p-3 rounded-xl min-w-[120px]">
                    <span className="block text-2xl font-bold text-[#f4d48b]">{userState ? userState.keys : 0}</span>
                    <span className="text-xs text-[#b8afcf]">Chìa khóa sở hữu</span>
                  </div>
                  <div className="bg-[#2a2441] p-3 rounded-xl min-w-[120px]">
                    <span className="block text-2xl font-bold text-[#9fe0bd]">{userState ? userState.unlocked.length : 0}</span>
                    <span className="text-xs text-[#b8afcf]">Char đã mở khóa</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-3">
                <h3 className="text-lg font-semibold text-[#f6f1ff]">🪐 Nhiệm vụ thiên hà</h3>
                <p className="text-[#b8afcf] text-sm">Ghé thăm sảnh nhân vật để đọc các câu chuyện và cho nhân vật ăn đồ uống tăng tình cảm.</p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="bg-[#2a2543] border border-[#393252] hover:border-[#ef9bc7] text-[#f6f1ff] px-4 py-2 rounded-xl text-sm"
                >
                  Khám phá nhân vật ngay ↗
                </button>
              </div>
            </section>
          )}

          {/* TAB 4: Cửa hàng (Store & Inventory) */}
          {activeTab === 'store' && (
            <section className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="font-serif text-2xl text-[#f6f1ff]">Cửa hàng thiên hà</h2>
                  <p className="text-[#b8afcf] text-sm">Dùng chìa khóa để đổi thức ăn và đồ uống. Mua sắm và tặng cho nhân vật yêu thích!</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShopCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      shopCategory === 'all' ? 'bg-[#59436e] border-[#ef9bc7] text-white' : 'bg-[#100e20] border-[#393252] text-[#b8afcf]'
                    }`}
                  >
                    Tất cả (20 món)
                  </button>
                  <button
                    onClick={() => setShopCategory('food')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      shopCategory === 'food' ? 'bg-[#59436e] border-[#ef9bc7] text-white' : 'bg-[#100e20] border-[#393252] text-[#b8afcf]'
                    }`}
                  >
                    🍰 Thức ăn (10 loại)
                  </button>
                  <button
                    onClick={() => setShopCategory('drink')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      shopCategory === 'drink' ? 'bg-[#59436e] border-[#ef9bc7] text-white' : 'bg-[#100e20] border-[#393252] text-[#b8afcf]'
                    }`}
                  >
                    🥤 Đồ uống (10 loại)
                  </button>
                </div>
              </div>

              {/* User Inventory Preview Banner */}
              {user && userState && (
                <div className="bg-[#1e1935] border border-[#aa9aff]/40 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-[#f4d48b] mb-2">🎒 Túi đồ của bạn (Inventory):</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(userState.inventory).filter(([_, count]) => count > 0).length === 0 ? (
                      <span className="text-xs text-[#b8afcf] italic">Chưa có vật phẩm nào trong túi đồ. Hãy đổi món đồ phía dưới!</span>
                    ) : (
                      Object.entries(userState.inventory)
                        .filter(([_, count]) => count > 0)
                        .map(([itemId, count]) => {
                          const itemObj = globalData.items.find(i => i.id === itemId);
                          return (
                            <div key={itemId} className="bg-[#2c2445] border border-[#59436e] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                              <span>{itemObj?.icon || '📦'}</span>
                              <span className="text-white font-medium">{itemObj?.name || itemId}</span>
                              <span className="bg-[#ef9bc7] text-[#100e20] font-extrabold px-1.5 py-0.2 rounded-full text-[10px]">
                                x{count}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredShopItems.map(item => {
                  const ownedCount = userState?.inventory[item.id] || 0;
                  return (
                    <div key={item.id} className="bg-[#1b1831] border border-[#393252] rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-[#ef9bc7] transition-all">
                      <div>
                        <div className="text-4xl mb-2 flex items-center justify-between">
                          <span>{item.icon}</span>
                          <span className="text-xs bg-[#2a2441] text-[#9fe0bd] px-2 py-0.5 rounded-full border border-[#393252]">
                            +{item.intimacyPoints} Thân mật
                          </span>
                        </div>
                        <h3 className="font-semibold text-[#f6f1ff] text-base">{item.name}</h3>
                        <p className="text-[#b8afcf] text-xs mt-1 min-h-[32px]">{item.desc}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#393252]/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#f4d48b] font-bold">🗝️ {item.price} chìa khóa</span>
                          {ownedCount > 0 && (
                            <span className="text-[#ef9bc7] text-[11px]">Đang có: x{ownedCount}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleBuyItem(item.id)}
                          className="w-full bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold py-2 rounded-xl text-xs hover:opacity-90 transition-all"
                        >
                          Đổi vật phẩm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 5: Đánh giá web (Reviews) */}
          {activeTab === 'reviews' && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Đánh giá Thiên Hà Ái Mộng</h2>
              
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4 max-w-3xl">
                <p className="text-sm text-[#b8afcf]">Bạn cảm thấy thế nào về website? Hãy để lại cảm nhận cho Yien nhé!</p>
                
                <div>
                  <label className="block text-xs text-[#b8afcf] mb-1">Điểm đánh giá</label>
                  <select
                    value={webReviewStars}
                    onChange={(e) => setWebReviewStars(Number(e.target.value))}
                    className="bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl px-4 py-2 text-sm outline-none w-full max-w-xs focus:border-[#ef9bc7]"
                  >
                    <option value={5}>★★★★★ · Tuyệt vời</option>
                    <option value={4}>★★★★☆ · Rất tốt</option>
                    <option value={3}>★★★☆☆ · Bình thường</option>
                    <option value={2}>★★☆☆☆ · Cần cải thiện</option>
                    <option value={1}>★☆☆☆☆ · Chưa hài lòng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#b8afcf] mb-1">Chia sẻ cảm nhận</label>
                  <textarea
                    rows={3}
                    placeholder="Viết vài dòng cảm nhận..."
                    value={webReviewText}
                    onChange={(e) => setWebReviewText(e.target.value)}
                    className="w-full bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl p-3 text-sm outline-none focus:border-[#ef9bc7]"
                  />
                </div>

                <button
                  onClick={handleSubmitWebReview}
                  className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  Gửi đánh giá
                </button>
              </div>

              {/* Reviews List */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4 max-w-3xl">
                <h3 className="font-serif text-xl text-[#f6f1ff]">Cảm nhận từ mọi người ({globalData.webReviews.length})</h3>
                {globalData.webReviews.length === 0 ? (
                  <p className="text-[#b8afcf] text-sm">Chưa có đánh giá nào.</p>
                ) : (
                  <div className="space-y-3 divide-y divide-[#393252]/60">
                    {globalData.webReviews.map(r => (
                      <div key={r.id} className="pt-3 first:pt-0 space-y-1">
                        <div className="flex justify-between items-center flex-wrap">
                          <b className="text-sm text-[#f6f1ff]">{r.user}</b>
                          <span className="text-[#f4d48b] text-sm">
                            {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                          </span>
                        </div>
                        <p className="text-xs text-[#ded6ee] leading-relaxed">{r.text}</p>
                        <span className="text-[11px] text-[#b8afcf]">{r.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 6: Âm nhạc (Music) */}
          {activeTab === 'music' && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Góc âm nhạc thiên hà</h2>
              {globalData.music.length === 0 ? (
                <div className="text-center py-12 text-[#b8afcf] border border-dashed border-[#393252] rounded-2xl">
                  Chưa có bài nhạc nào. CRT Admin có thể thêm bài hát trong bảng quản trị.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {globalData.music.map(m => {
                    const embed = ytEmbed(m.url);
                    const isAudio = /\.(mp3|ogg|wav|m4a)(\?.*)?$/i.test(m.url);

                    return (
                      <div key={m.id} className="bg-[#1b1831] border border-[#393252] rounded-2xl p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-base text-[#f6f1ff]">{m.name}</h3>
                          <p className="text-[#b8afcf] text-xs">{m.artist || 'Nghệ sĩ chưa cập nhật'}</p>
                        </div>
                        
                        <div>
                          {embed ? (
                            <iframe
                              className="w-full h-44 rounded-xl border border-[#393252]"
                              src={embed}
                              title={m.name}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : isAudio ? (
                            <audio controls className="w-full">
                              <source src={safeUrl(m.url)} />
                            </audio>
                          ) : (
                            <a
                              href={safeUrl(m.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-xs text-[#ef9bc7] hover:underline"
                            >
                              Mở đường dẫn nhạc ↗
                            </a>
                          )}
                        </div>

                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleAdminDeleteMusic(m.id)}
                            className="bg-[#2a2441] border border-[#87505d] text-[#ffd9df] px-3 py-1 rounded-xl text-xs"
                          >
                            Xóa nhạc
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 7: Tài khoản (Profile) */}
          {activeTab === 'profile' && (
            <section className="space-y-6 max-w-2xl">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Hồ sơ của bạn</h2>
              
              {!user ? (
                <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 text-center text-[#b8afcf]">
                  Đăng nhập để quản lý hồ sơ cá nhân.
                </div>
              ) : (
                <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-4 border-b border-[#393252] pb-4">
                    {user.avatar ? (
                      <img src={safeUrl(user.avatar)} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#ef9bc7]" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#342747] flex items-center justify-center text-2xl text-[#f4d48b]">
                        ✦
                      </div>
                    )}
                    <div>
                      <b className="text-lg text-[#f6f1ff]">{user.name}</b>
                      <div className="text-xs text-[#b8afcf]">@{user.username}</div>
                      <div className="text-xs text-[#f4d48b] mt-1">Vai trò: {user.role === 'admin' ? 'Quản trị viên (CRT)' : 'Thành viên'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#b8afcf] mb-1">Tên hiển thị</label>
                      <input
                        type="text"
                        value={pDisplay}
                        onChange={(e) => setPDisplay(e.target.value)}
                        className="w-full bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl p-2.5 text-sm outline-none focus:border-[#ef9bc7]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#b8afcf] mb-1">Avatar (URL ảnh)</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={pAvatar}
                        onChange={(e) => setPAvatar(e.target.value)}
                        className="w-full bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl p-2.5 text-sm outline-none focus:border-[#ef9bc7]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#b8afcf] mb-1">Mật khẩu mới (để trống nếu không đổi)</label>
                      <input
                        type="password"
                        placeholder="Mật khẩu mới"
                        value={pPassword}
                        onChange={(e) => setPPassword(e.target.value)}
                        className="w-full bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl p-2.5 text-sm outline-none focus:border-[#ef9bc7]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-6 py-2.5 rounded-xl text-sm"
                  >
                    Lưu hồ sơ
                  </button>
                </div>
              )}
            </section>
          )}

          {/* TAB 8: Quản trị (Admin) */}
          {activeTab === 'admin' && user?.role === 'admin' && (
            <section className="space-y-6">
              <h2 className="font-serif text-2xl text-[#f6f1ff]">Bảng điều khiển quản trị (CRT)</h2>
              
              <div className="bg-[#332b25] border border-[#806b49] text-[#f5dfb1] p-4 rounded-xl text-xs leading-relaxed">
                ⚙️ Quyền quản trị đang hoạt động với tài khoản CRT <b>Yien0804</b>. Mọi chỉnh sửa nhân vật, cửa hàng, âm nhạc tại đây sẽ lập tức cập nhật real-time tới tất cả người dùng trên hệ thống database chung!
              </div>

              {/* Section: Add / Edit Character */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg text-[#f3cce4]">
                  {editCharId ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Tên nhân vật</label>
                    <input
                      type="text"
                      placeholder="Tên nhân vật"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Phân loại</label>
                    <select
                      value={cRating}
                      onChange={(e) => setCRating(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    >
                      <option>Phù hợp mọi lứa tuổi</option>
                      <option>Thiếu niên</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#b8afcf] mb-1">Link nhân vật</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={cLink}
                      onChange={(e) => setCLink(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#b8afcf] mb-1">Cốt truyện</label>
                    <textarea
                      rows={4}
                      placeholder="Giới thiệu nhân vật và cốt truyện..."
                      value={cStory}
                      onChange={(e) => setCStory(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Tag (phân cách bằng dấu phẩy)</label>
                    <input
                      type="text"
                      placeholder="Thanh xuân, Học đường"
                      value={cTags}
                      onChange={(e) => setCTags(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Khóa bằng chìa khóa?</label>
                    <select
                      value={cLocked ? 'true' : 'false'}
                      onChange={(e) => setCLocked(e.target.value === 'true')}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    >
                      <option value="false">Không khóa</option>
                      <option value="true">Khóa (yêu cầu 5 chìa khóa)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#b8afcf] mb-1">Mật khẩu riêng nhân vật (để trống nếu không có)</label>
                    <input
                      type="text"
                      placeholder="Mật khẩu phụ tùy chọn"
                      value={cPass}
                      onChange={(e) => setCPass(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAdminSaveChar}
                    className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-6 py-2.5 rounded-xl text-sm"
                  >
                    Lưu nhân vật
                  </button>
                  <button
                    onClick={clearCharForm}
                    className="bg-[#2a2543] border border-[#393252] text-[#f6f1ff] px-4 py-2.5 rounded-xl text-sm"
                  >
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Admin Manage Characters List */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-base text-[#f6f1ff]">Danh sách nhân vật hiện có ({globalData.chars.length})</h3>
                <div className="space-y-2">
                  {globalData.chars.map(c => (
                    <div key={c.id} className="p-3 bg-[#100e20] border border-[#393252] rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <b className="text-sm text-[#f6f1ff]">{c.name}</b>
                        <span className="text-xs text-[#b8afcf] ml-2">
                          {c.locked ? '🔒 Khóa' : '🔓 Tự do'} · ♡ {c.likes} tim · {c.views} xem
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdminEditChar(c)}
                          className="bg-[#322447] border border-[#393252] text-xs text-[#e7c9e9] px-3 py-1 rounded-lg"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleAdminDeleteChar(c.id)}
                          className="bg-[#2a2441] border border-[#87505d] text-xs text-[#ffd9df] px-3 py-1 rounded-lg"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Add / Edit Shop Item */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg text-[#f3cce4]">
                  {editItemId ? 'Chỉnh sửa vật phẩm' : 'Thêm vật phẩm cửa hàng mới'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Tên vật phẩm</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Bánh Ngọt Ái Mộng"
                      value={iName}
                      onChange={(e) => setIName(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Loại vật phẩm</label>
                    <select
                      value={iType}
                      onChange={(e) => setIType(e.target.value as any)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    >
                      <option value="food">🍰 Thức ăn</option>
                      <option value="drink">🥤 Đồ uống</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Icon Emoji</label>
                    <input
                      type="text"
                      placeholder="🍰"
                      value={iIcon}
                      onChange={(e) => setIIcon(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Giá (chìa khóa)</label>
                    <input
                      type="number"
                      min={0}
                      value={iPrice}
                      onChange={(e) => setIPrice(Number(e.target.value))}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Điểm thân mật cộng thêm</label>
                    <input
                      type="number"
                      min={1}
                      value={iIntimacy}
                      onChange={(e) => setIIntimacy(Number(e.target.value))}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#b8afcf] mb-1">Mô tả vật phẩm</label>
                    <input
                      type="text"
                      placeholder="Mô tả ngắn..."
                      value={iDesc}
                      onChange={(e) => setIDesc(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAdminSaveItem}
                    className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-6 py-2.5 rounded-xl text-sm"
                  >
                    Lưu vật phẩm
                  </button>
                  <button
                    onClick={clearItemForm}
                    className="bg-[#2a2543] border border-[#393252] text-[#f6f1ff] px-4 py-2.5 rounded-xl text-sm"
                  >
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Admin Manage Items List */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-base text-[#f6f1ff]">Danh sách vật phẩm hiện có ({globalData.items.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {globalData.items.map(i => (
                    <div key={i.id} className="p-3 bg-[#100e20] border border-[#393252] rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{i.icon}</span>
                        <div>
                          <b className="text-xs text-[#f6f1ff]">{i.name}</b>
                          <div className="text-[11px] text-[#b8afcf]">
                            🗝️ {i.price} chìa · +{i.intimacyPoints} Thân mật
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAdminEditItem(i)}
                          className="bg-[#322447] border border-[#393252] text-[11px] text-[#e7c9e9] px-2.5 py-1 rounded-lg"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleAdminDeleteItem(i.id)}
                          className="bg-[#2a2441] border border-[#87505d] text-[11px] text-[#ffd9df] px-2.5 py-1 rounded-lg"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Manage Music */}
              <div className="bg-[#1b1831] border border-[#393252] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg text-[#f3cce4]">Thêm bài nhạc mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Tên bài nhạc</label>
                    <input
                      type="text"
                      placeholder="Tên bài hát"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b8afcf] mb-1">Nghệ sĩ</label>
                    <input
                      type="text"
                      placeholder="Ca sĩ / Nghệ sĩ"
                      value={mArtist}
                      onChange={(e) => setMArtist(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#b8afcf] mb-1">URL YouTube hoặc link MP3</label>
                    <input
                      type="text"
                      placeholder="https://youtu.be/... hoặc link .mp3"
                      value={mUrl}
                      onChange={(e) => setMUrl(e.target.value)}
                      className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAdminAddMusic}
                  className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  Thêm nhạc
                </button>
              </div>

            </section>
          )}

          {/* Footer */}
          <footer className="text-center text-[#827995] py-8 text-xs border-t border-[#393252]/40 mt-12">
            ✦ Thiên Hà Ái Mộng - Yien · Một góc nhỏ dành cho những câu chuyện ✦
          </footer>
        </main>
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-[#080711d9] backdrop-blur-sm grid place-items-center p-4 z-50">
          <div className="w-full max-w-md bg-[#1d1933] border border-[#68547d] rounded-2xl p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#f6f1ff]">Đăng nhập thiên hà</h2>
            <p className="text-[#b8afcf] text-xs">Đăng nhập hoặc tạo tài khoản để sử dụng hệ thống.</p>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-[#b8afcf] mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  placeholder="Tên đăng nhập"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none focus:border-[#ef9bc7]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b8afcf] mb-1">Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#100e20] border border-[#393252] rounded-xl p-2.5 text-[#f6f1ff] outline-none focus:border-[#ef9bc7]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleLogin}
                className="flex-1 bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold py-2.5 rounded-xl text-sm"
              >
                Đăng nhập
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 bg-[#2a2543] border border-[#393252] text-[#f6f1ff] py-2.5 rounded-xl text-sm"
              >
                Tạo tài khoản
              </button>
            </div>

            <div className="bg-[#332b25] border border-[#806b49] text-[#f5dfb1] p-3 rounded-xl text-xs">
              🔑 Tài khoản CRT Quản trị: <b>Yien0804</b> · Mật khẩu: <b>yien843</b>
            </div>

            <button
              onClick={() => setAuthModalOpen(false)}
              className="w-full text-center text-xs text-[#b8afcf] hover:underline pt-1"
            >
              Đóng modal
            </button>
          </div>
        </div>
      )}

      {/* Character Detail Modal */}
      {selectedCharObj && (
        <div
          className="fixed inset-0 bg-[#080711d9] backdrop-blur-sm grid place-items-center p-4 z-50 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setSelectedCharId(null)}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1d1933] border border-[#68547d] rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-serif text-3xl text-[#f6f1ff]">{selectedCharObj.name}</h2>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCharObj.tags.map(t => (
                    <span key={t} className="bg-[#342c4b] text-[#e7c9e9] text-xs px-2.5 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedCharId(null)}
                className="text-[#b8afcf] hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Intimacy Score Bar */}
            <div className="bg-[#2a2441] border border-[#393252] p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs text-[#b8afcf] flex items-center gap-1.5">
                <span>💖 Mức độ thân mật:</span>
                <b className="text-[#ef9bc7] text-base">{userState?.intimacy[selectedCharObj.id] || 0} điểm</b>
              </span>
              {user && (
                <button
                  onClick={() => setFeedModalCharId(selectedCharObj.id)}
                  className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-3 py-1.5 rounded-xl text-xs"
                >
                  🍰 Tặng thức ăn / đồ uống
                </button>
              )}
            </div>

            <div className="text-sm text-[#ded6ee] whitespace-pre-wrap leading-relaxed border-t border-b border-[#393252] py-4">
              {selectedCharObj.story}
            </div>

            {selectedCharObj.link && (
              <p>
                <a
                  href={safeUrl(selectedCharObj.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#e9b5dc] hover:underline"
                >
                  Mở liên kết câu chuyện ↗
                </a>
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleLike(selectedCharObj.id)}
                className="bg-[#2a2543] border border-[#393252] text-xs text-[#f6f1ff] px-4 py-2 rounded-xl"
              >
                ♡ Tim ({selectedCharObj.likes || 0})
              </button>
              <button
                onClick={() => handleToggleSave(selectedCharObj.id)}
                className="bg-[#2a2543] border border-[#393252] text-xs text-[#f6f1ff] px-4 py-2 rounded-xl"
              >
                ☆ Lưu nhân vật
              </button>
            </div>

            {/* Comments Section */}
            <div className="space-y-3 pt-2">
              <h3 className="font-serif text-lg text-[#f6f1ff]">Bình luận ({selectedCharObj.comments.length})</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedCharObj.comments.length === 0 ? (
                  <p className="text-xs text-[#b8afcf] italic">Chưa có bình luận nào.</p>
                ) : (
                  selectedCharObj.comments.map(c => (
                    <div key={c.id} className="border-t border-[#393252] pt-3 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <b className="text-[#f6f1ff]">{c.user}</b>
                        <span className="text-[11px] text-[#b8afcf]">{c.date}</span>
                      </div>
                      <p className="text-[#ded6ee]">{c.text}</p>
                      
                      {/* Replies */}
                      {c.replies?.map((r, idx) => (
                        <div key={idx} className="ml-4 pl-2 border-l-2 border-[#69547f] mt-1 text-[11px] text-[#b8afcf]">
                          <b className="text-white">{r.user}:</b> {r.text}
                        </div>
                      ))}

                      {replyTargetId === c.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Trả lời bình luận..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1 bg-[#100e20] border border-[#393252] rounded-lg p-1.5 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => handleReplyComment(selectedCharObj.id, c.id)}
                            className="bg-[#59436e] text-white px-3 py-1 rounded-lg text-xs"
                          >
                            Gửi
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyTargetId(c.id)}
                          className="text-[#ef9bc7] hover:underline text-[11px] pt-0.5"
                        >
                          ↳ Trả lời
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="space-y-2 pt-2 border-t border-[#393252]">
                <textarea
                  rows={2}
                  placeholder="Chia sẻ cảm nhận về nhân vật này..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full bg-[#100e20] text-[#f6f1ff] border border-[#393252] rounded-xl p-2.5 text-xs outline-none focus:border-[#ef9bc7]"
                />
                <button
                  onClick={() => handleAddComment(selectedCharObj.id)}
                  className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Gửi bình luận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feeding Modal (Cho ăn / cho uống) */}
      {feedCharObj && (
        <div
          className="fixed inset-0 bg-[#080711d9] backdrop-blur-sm grid place-items-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setFeedModalCharId(null)}
        >
          <div className="w-full max-w-lg bg-[#1d1933] border border-[#68547d] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl text-[#f6f1ff]">
                Tặng đồ cho <span className="text-[#ef9bc7]">{feedCharObj.name}</span>
              </h3>
              <button onClick={() => setFeedModalCharId(null)} className="text-[#b8afcf] hover:text-white">✕</button>
            </div>

            <p className="text-xs text-[#b8afcf]">
              Chọn món ăn hoặc đồ uống từ túi đồ của bạn để gia tăng điểm thân mật:
            </p>

            {userState && Object.entries(userState.inventory).filter(([_, count]) => count > 0).length === 0 ? (
              <div className="text-center py-6 text-xs text-[#b8afcf] border border-dashed border-[#393252] rounded-xl">
                Túi đồ của bạn đang trống! Hãy ghé <b>Cửa hàng</b> để dùng chìa khóa đổi đồ ăn & đồ uống.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {userState && Object.entries(userState.inventory)
                  .filter(([_, count]) => count > 0)
                  .map(([itemId, count]) => {
                    const itemObj = globalData.items.find(i => i.id === itemId);
                    if (!itemObj) return null;

                    return (
                      <div key={itemId} className="p-3 bg-[#100e20] border border-[#393252] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{itemObj.icon}</span>
                          <div>
                            <b className="text-xs text-[#f6f1ff]">{itemObj.name}</b>
                            <div className="text-[11px] text-[#9fe0bd]">
                              +{itemObj.intimacyPoints} điểm thân mật · Số lượng: x{count}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUseItemOnChar(itemId, feedCharObj.id)}
                          className="bg-gradient-to-r from-[#d77caf] to-[#8f75d5] text-[#21172d] font-bold px-3 py-1.5 rounded-xl text-xs"
                        >
                          Sử dụng
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            <button
              onClick={() => setFeedModalCharId(null)}
              className="w-full bg-[#2a2543] border border-[#393252] text-xs text-[#f6f1ff] py-2 rounded-xl mt-2"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
