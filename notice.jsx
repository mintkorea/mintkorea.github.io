import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { Plus, X, ChevronLeft, Loader2, Edit2, Trash2 } from 'lucide-react';

// Firebase 환경 변수 설정
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sungui-duty-app';

const App = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 입력 필드 상태
  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState('성의회관');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

  // 1. 인증 로직 (RULE 3 준수)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. 데이터 실시간 동기화 (RULE 1, 2 준수)
  useEffect(() => {
    if (!user) return;
    
    // 경로: /artifacts/{appId}/public/data/notices
    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'notices');
    const q = query(postsCol);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // 복합 쿼리 대신 메모리 내 정렬 (RULE 2)
      postData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(postData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // 글 등록 및 수정 핸들러
  const handlePostSubmit = useCallback(async () => {
    if (!content.trim() || !author.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const noticesCol = collection(db, 'artifacts', appId, 'public', 'data', 'notices');
      
      if (editingId) {
        // 수정 모드
        const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'notices', editingId);
        await updateDoc(postRef, {
          category,
          content,
          author,
          updatedAt: serverTimestamp()
        });
      } else {
        // 신규 등록
        await addDoc(noticesCol, {
          category,
          content,
          author,
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      }
      closeModal();
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, author, category, user, isSubmitting, editingId]);

  // 삭제 핸들러
  const handleDelete = async (postId) => {
    if (!window.confirm("게시물을 정말 삭제하시겠습니까?")) return;
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'notices', postId);
      await deleteDoc(postRef);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const openEditModal = (post) => {
    setEditingId(post.id);
    setCategory(post.category || '성의회관');
    setContent(post.content);
    setAuthor(post.author);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCategory('성의회관');
    setContent('');
    setAuthor('');
  };

  const getCategoryStyle = (cat) => {
    switch(cat) {
      case '공지사항': return 'bg-rose-50 text-rose-600 border-rose-100';
      case '성의회관': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case '의산연': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans">
      {/* 상단 헤더 */}
      <header className="bg-[#2d3e75] text-white px-6 py-5 sticky top-0 z-50 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">인수인계 및 공지</h1>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Catholic Board System</p>
          </div>
        </div>
      </header>

      {/* 게시글 리스트 */}
      <main className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 opacity-50">
            <Loader2 className="w-8 h-8 text-[#2d3e75] animate-spin" />
            <p className="text-sm font-bold text-slate-500">데이터를 불러오고 있습니다</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-40">
            <p className="text-slate-400 font-bold">등록된 게시물이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-lg text-[11px] font-black border ${getCategoryStyle(post.category)}`}>
                      {post.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '방금 전'}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => openEditModal(post)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[15px] font-bold leading-relaxed text-slate-800 mb-4 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="flex justify-end items-center pt-3 border-t border-slate-50">
                    <span className="text-[12px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                      작성자: {post.author}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 글쓰기 플로팅 버튼 */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-[#2d3e75] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* 입력 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-slate-800">{editingId ? '게시물 수정' : '새 글 등록'}</h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                {['성의회관', '의산연', '공지사항'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setCategory(cat)}
                    className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${category === cat ? 'bg-[#2d3e75] text-white border-[#2d3e75]' : 'bg-white text-slate-400 border-slate-100'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={author} 
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="작성자 성함"
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold focus:bg-white focus:border-[#2d3e75] outline-none transition-all text-sm"
                />
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="공지 또는 인수인계 내용을 입력하세요"
                  className="w-full h-40 px-5 py-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold focus:bg-white focus:border-[#2d3e75] outline-none resize-none transition-all text-sm"
                ></textarea>
              </div>

              <button 
                onClick={handlePostSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-[#2d3e75] text-white rounded-xl font-black text-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <span>{editingId ? '수정하기' : '등록하기'}</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
