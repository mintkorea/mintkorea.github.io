import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, serverTimestamp, query } from 'firebase/firestore';
import { 
  Search, Plus, ChevronLeft, MoreVertical, Edit2, Trash2, 
  Bold, Italic, Underline, Palette, MessageSquare, Clock, User
} from 'lucide-react';

// Firebase 설정
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 게시판 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  
  // 글쓰기 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState('공지사항');
  const [authorName, setAuthorName] = useState('관리자');

  const editorRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => { if (u) { setUser(u); setLoading(false); } });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    // 인덱스 페이지의 '최신 공지'와 연동되는 컬렉션
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'notices');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Firestore Error:", err));

    return () => unsub();
  }, [user]);

  const handleAddPost = async () => {
    const contentHtml = editorRef.current?.innerHTML || "";
    if (!newTitle.trim() || !contentHtml.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), {
        title: newTitle,
        content: contentHtml,
        category,
        author: authorName,
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      setNewTitle('');
      setIsWriting(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("이 게시물을 영구적으로 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notices', id));
  };

  const applyStyle = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
  };

  // 필터링 로직
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === '전체' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin text-blue-600 font-black text-4xl">C</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body { font-family: 'Pretendard', sans-serif; }
        .prose b { font-weight: 800; color: #1e293b; }
        .prose i { font-style: italic; }
        .prose u { text-decoration: underline; }
        [contenteditable]:empty:before { content: attr(placeholder); color: #cbd5e1; }
      `}</style>

      {/* 상단 툴바 및 네비게이션 (전문적인 레이아웃) */}
      <nav className="bg-[#0F172A] text-white sticky top-0 z-[100] shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none mb-1">통합 정보 게시판</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sungui Medical Campus System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[11px] font-black text-blue-400">Authenticated</span>
                <span className="text-[10px] text-slate-500 font-bold">{user.uid.slice(0,8)}...</span>
             </div>
             <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center overflow-hidden">
                <User size={18} className="text-slate-400" />
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* 필터 및 검색 바 */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            {['전체', '공지사항', '인수인계', '시설안내'].map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="게시글 제목이나 본문 내용을 검색하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 p-4 pl-14 rounded-2xl shadow-sm focus:ring-4 ring-blue-500/5 outline-none font-bold text-slate-700 transition-all"
            />
          </div>

          <button 
            onClick={() => setIsWriting(!isWriting)}
            className={`px-8 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 ${isWriting ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
          >
            {isWriting ? '목록으로 돌아가기' : <><Plus size={20} /> 새 글 작성</>}
          </button>
        </div>

        {isWriting ? (
          /* 글쓰기 모드: 전문가용 에디터 (image_bcb6ac 스타일) */
          <div className="bg-white rounded-[40px] shadow-2xl border border-blue-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="p-10 space-y-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48">
                  <label className="text-[11px] font-black text-slate-400 mb-2 block ml-2">카테고리</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option>공지사항</option>
                    <option>인수인계</option>
                    <option>시설안내</option>
                    <option>일반사항</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-black text-slate-400 mb-2 block ml-2">게시글 제목</label>
                  <input 
                    placeholder="공지할 내용의 핵심 제목을 입력하세요"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-lg outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 mb-2 block ml-2">상세 내용 작성</label>
                <div className="border-2 border-slate-100 rounded-[32px] overflow-hidden focus-within:border-blue-500 transition-all">
                  <div className="bg-slate-50 p-3 border-b-2 border-slate-100 flex gap-2 flex-wrap">
                    <button onClick={() => applyStyle('bold')} className="p-2.5 hover:bg-white rounded-xl text-slate-600 transition-all"><Bold size={18}/></button>
                    <button onClick={() => applyStyle('italic')} className="p-2.5 hover:bg-white rounded-xl text-slate-600 transition-all"><Italic size={18}/></button>
                    <button onClick={() => applyStyle('underline')} className="p-2.5 hover:bg-white rounded-xl text-slate-600 transition-all"><Underline size={18}/></button>
                    <div className="w-px h-6 bg-slate-200 mx-2 self-center" />
                    <button onClick={() => applyStyle('foreColor', '#ef4444')} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-red-500 font-black text-xs">Red</button>
                    <button onClick={() => applyStyle('foreColor', '#3b82f6')} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-blue-500 font-black text-xs">Blue</button>
                    <button onClick={() => applyStyle('foreColor', '#1e293b')} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-black text-xs">Black</button>
                  </div>
                  <div 
                    ref={editorRef}
                    contentEditable 
                    placeholder="업무 지시사항이나 공지할 상세 내용을 입력하세요..."
                    className="w-full min-h-[400px] p-8 outline-none text-slate-700 leading-relaxed font-medium text-lg prose max-w-none bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full">
                  <label className="text-[11px] font-black text-slate-400 mb-2 block ml-2">작성자 성명</label>
                  <input 
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddPost}
                  className="w-full md:w-auto px-12 py-5 bg-[#0F172A] text-white rounded-2xl font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-95"
                >
                  게시글 등록 완료
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 목록 모드: 카드 기반의 정교한 리스트 (image_bd908c 스타일) */
          <div className="grid grid-cols-1 gap-8">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                <div className="p-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${
                        post.category === '공지사항' ? 'bg-red-50 text-red-500 border-red-100' : 
                        post.category === '인수인계' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {post.category}
                      </span>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock size={14} />
                        <span className="text-[11px] font-bold">
                          {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : '방금 전'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleDeletePost(post.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                          <Trash2 size={20} />
                       </button>
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-slate-800 mb-8 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>

                  <div className="bg-slate-50/50 p-10 rounded-[32px] border border-slate-100/50 mb-8">
                    <div 
                      className="text-slate-600 text-[17px] leading-loose prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: post.content }} 
                    />
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs">
                        {post.author?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">{post.author}</span>
                        <span className="text-[10px] font-bold text-slate-400">Authorized Personnel</span>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 text-blue-600 font-black text-xs hover:gap-3 transition-all">
                      자세히 보기 ❯
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPosts.length === 0 && (
              <div className="text-center py-40 bg-white rounded-[50px] border-4 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">검색 결과가 없습니다</h3>
                <p className="text-slate-400 font-bold">다른 검색어를 입력하거나 카테고리를 변경해보세요.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 opacity-30">
         <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">CMC</div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase">The Catholic University of Korea Medical Campus</p>
         </div>
      </footer>
    </div>
  );
}
