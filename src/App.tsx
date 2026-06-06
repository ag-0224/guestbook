import { useState, useEffect } from 'react'
import { 
  Sun, Moon, Search, RotateCw, Plus, Trash2, Pencil, 
  Smile, User, MessageSquare, Heart, BarChart3, Inbox, X 
} from 'lucide-react'
import { supabase } from './supabaseClient'

interface GuestbookEntry {
  id: string
  nickname: string
  emoji: string
  color: string
  content: string
  password?: string | null
  created_at: string
}

const EMOJI_CHOICES = ['💡', '✨', '💖', '🔥', '🎉', '🍀', '🐾', '🚀', '🐱', '⭐']
const COLOR_CHOICES = [
  { value: 'purple', label: '보라', colorCode: '#d8b4fe' },
  { value: 'pink', label: '핑크', colorCode: '#fbcfe8' },
  { value: 'blue', label: '블루', colorCode: '#bae6fd' },
  { value: 'green', label: '그린', colorCode: '#bbf7d0' },
  { value: 'yellow', label: '옐로우', colorCode: '#fef08a' },
  { value: 'orange', label: '오렌지', colorCode: '#ffedd5' }
]

function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('guestbook-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Data State
  const [guestbooks, setGuestbooks] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>('all')

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Modal Control States
  const [isWriteOpen, setIsWriteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false)
  const [isSimpleDeleteOpen, setIsSimpleDeleteOpen] = useState(false)

  // Active Item for Edit/Delete
  const [activeEntry, setActiveEntry] = useState<GuestbookEntry | null>(null)
  const [passwordActionType, setPasswordActionType] = useState<'edit' | 'delete' | null>(null)

  // Form Field States
  const [nickname, setNickname] = useState('')
  const [emoji, setEmoji] = useState('💡')
  const [color, setColor] = useState('purple')
  const [content, setContent] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Password Verification Field State
  const [promptPasswordInput, setPromptPasswordInput] = useState('')
  const [promptPasswordError, setPromptPasswordError] = useState<string | null>(null)

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('guestbook-theme', theme)
  }, [theme])

  // Toast Timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Fetch Guestbooks
  const fetchGuestbooks = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('guestbooks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setGuestbooks(data || [])
    } catch (err: any) {
      console.error(err)
      showToast('방명록을 가져오는 데 실패했습니다.', 'error')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuestbooks()
  }, [])

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Date Formatting helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    let hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? '오후' : '오전'
    
    hours = hours % 12
    hours = hours ? hours : 12
    const formattedHours = String(hours).padStart(2, '0')

    return `${month}월 ${day}일 ${ampm} ${formattedHours}:${minutes}`
  }

  // Statistics Calculations
  const totalCount = guestbooks.length

  const getMostUsedEmoji = () => {
    if (guestbooks.length === 0) return '없음'
    const counts: Record<string, number> = {}
    guestbooks.forEach(g => {
      counts[g.emoji] = (counts[g.emoji] || 0) + 1
    })
    
    let max = 0
    let mostUsed = '없음'
    Object.entries(counts).forEach(([em, count]) => {
      if (count > max) {
        max = count
        mostUsed = em
      }
    })
    return mostUsed
  }

  const getMostPopularColor = () => {
    if (guestbooks.length === 0) return '없음'
    const counts: Record<string, number> = {}
    guestbooks.forEach(g => {
      counts[g.color] = (counts[g.color] || 0) + 1
    })

    let max = 0
    let mostPopular = 'purple'
    Object.entries(counts).forEach(([col, count]) => {
      if (count > max) {
        max = count
        mostPopular = col
      }
    })

    const found = COLOR_CHOICES.find(c => c.value === mostPopular)
    return found ? found.label : '없음'
  }

  // Search & Filter list
  const filteredGuestbooks = guestbooks.filter(g => {
    const matchesSearch = 
      g.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesColor = selectedColor === 'all' || g.color === selectedColor
    return matchesSearch && matchesColor
  })

  // Create Guestbook Entry
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nickname.trim()) {
      setFormError('닉네임을 입력해 주세요.')
      return
    }
    if (!content.trim()) {
      setFormError('내용을 입력해 주세요.')
      return
    }

    try {
      const { error } = await supabase.from('guestbooks').insert([
        {
          nickname: nickname.trim(),
          emoji,
          color,
          content: content.trim(),
          password: password.trim() || null
        }
      ])

      if (error) throw error

      showToast('새 방명록이 작성되었습니다!', 'success')
      setIsWriteOpen(false)
      resetForm()
      fetchGuestbooks(true)
    } catch (err: any) {
      console.error(err)
      setFormError(err.message || '저장하는 중 오류가 발생했습니다.')
    }
  }

  // Open Edit flow
  const handleEditClick = (entry: GuestbookEntry) => {
    setActiveEntry(entry)
    if (entry.password) {
      setPasswordActionType('edit')
      setPromptPasswordInput('')
      setPromptPasswordError(null)
      setIsPasswordPromptOpen(true)
    } else {
      // No password, open edit form directly
      setNickname(entry.nickname)
      setEmoji(entry.emoji)
      setColor(entry.color)
      setContent(entry.content)
      setPassword('')
      setFormError(null)
      setIsEditOpen(true)
    }
  }

  // Open Delete flow
  const handleDeleteClick = (entry: GuestbookEntry) => {
    setActiveEntry(entry)
    if (entry.password) {
      setPasswordActionType('delete')
      setPromptPasswordInput('')
      setPromptPasswordError(null)
      setIsPasswordPromptOpen(true)
    } else {
      setIsSimpleDeleteOpen(true)
    }
  }

  // Verify Password
  const handlePasswordVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeEntry) return

    if (activeEntry.password !== promptPasswordInput.trim()) {
      setPromptPasswordError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsPasswordPromptOpen(false)
    
    if (passwordActionType === 'edit') {
      setNickname(activeEntry.nickname)
      setEmoji(activeEntry.emoji)
      setColor(activeEntry.color)
      setContent(activeEntry.content)
      setPassword(activeEntry.password || '')
      setFormError(null)
      setIsEditOpen(true)
    } else if (passwordActionType === 'delete') {
      executeDelete(activeEntry.id)
    }
  }

  // Execute Delete
  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('guestbooks').delete().eq('id', id)
      if (error) throw error

      showToast('방명록이 삭제되었습니다.', 'success')
      setIsSimpleDeleteOpen(false)
      fetchGuestbooks(true)
    } catch (err: any) {
      console.error(err)
      showToast('삭제에 실패했습니다.', 'error')
    }
  }

  // Update Guestbook Entry
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeEntry) return
    setFormError(null)

    if (!nickname.trim()) {
      setFormError('닉네임을 입력해 주세요.')
      return
    }
    if (!content.trim()) {
      setFormError('내용을 입력해 주세요.')
      return
    }

    try {
      const { error } = await supabase
        .from('guestbooks')
        .update({
          nickname: nickname.trim(),
          emoji,
          color,
          content: content.trim(),
          password: password.trim() || null
        })
        .eq('id', activeEntry.id)

      if (error) throw error

      showToast('방명록이 수정되었습니다.', 'success')
      setIsEditOpen(false)
      resetForm()
      fetchGuestbooks(true)
    } catch (err: any) {
      console.error(err)
      setFormError(err.message || '수정하는 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setNickname('')
    setEmoji('💡')
    setColor('purple')
    setContent('')
    setPassword('')
    setFormError(null)
    setActiveEntry(null)
    setPasswordActionType(null)
  }

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <>
      {/* Header Card */}
      <header className="header-card">
        <div className="header-left">
          <div className="header-icon-container">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="header-title-section">
            <h1>Likelion Vacation Guestbook</h1>
            <p>실시간 방명록 보드 (Supabase & React)</p>
          </div>
        </div>
        <button 
          className="btn-toggle-theme" 
          onClick={toggleTheme}
          aria-label="테마 전환"
          title={theme === 'light' ? '다크 모드로 변경' : '라이트 모드로 변경'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {/* Statistics Panels */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <MessageSquare size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">전체 방명록 수</span>
            <span className="stat-value">{totalCount}개</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <Heart size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">가장 많이 쓰인 이모지</span>
            <span className="stat-value">{getMostUsedEmoji()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <BarChart3 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">인기 포스트잇 컬러</span>
            <span className="stat-value">{getMostPopularColor()}</span>
          </div>
        </div>
      </section>

      {/* Controls: Search, Filter, Buttons */}
      <section className="controls-bar">
        <div className="controls-left">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="방명록 이름 또는 내용 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <button
              className={`filter-pill ${selectedColor === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedColor('all')}
            >
              전체
            </button>
            {COLOR_CHOICES.map(c => (
              <button
                key={c.value}
                className={`filter-pill ${selectedColor === c.value ? 'active' : ''}`}
                onClick={() => setSelectedColor(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-right">
          <button 
            className="btn-icon-only" 
            onClick={() => fetchGuestbooks()} 
            title="새로고침"
            aria-label="새로고침"
          >
            <RotateCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
          <button 
            className="btn-primary" 
            onClick={() => {
              resetForm()
              setIsWriteOpen(true)
            }}
          >
            <Plus size={18} />
            <span>새 포스트잇 쓰기</span>
          </button>
        </div>
      </section>

      {/* Post-it Cards Grid */}
      <main>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            <RotateCw size={36} className="spinning" style={{ marginBottom: '12px' }} />
            <p>방명록을 불러오는 중입니다...</p>
          </div>
        ) : filteredGuestbooks.length === 0 ? (
          <div className="empty-state">
            <Inbox className="empty-state-icon" size={48} />
            <h3>방명록이 비어 있습니다</h3>
            <p>첫 번째로 따뜻한 방명록을 작성해 보세요!</p>
          </div>
        ) : (
          <div className="postit-grid">
            {filteredGuestbooks.map(entry => (
              <article key={entry.id} className={`postit-card ${entry.color}`}>
                <div>
                  <div className="card-header">
                    <div className="card-author-info">
                      <span className="card-emoji">{entry.emoji}</span>
                      <div className="card-meta">
                        <span className="card-nickname">
                          <User size={13} className="card-nickname-icon" />
                          {entry.nickname}
                        </span>
                        <span className="card-date">{formatDate(entry.created_at)}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn-card-action" 
                        onClick={() => handleEditClick(entry)}
                        title="수정하기"
                        aria-label="수정하기"
                      >
                        <Pencil size={13} />
                      </button>
                      <button 
                        className="btn-card-action" 
                        onClick={() => handleDeleteClick(entry)}
                        title="삭제하기"
                        aria-label="삭제하기"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="card-content">{entry.content}</p>
                </div>
                <div className="card-footer-line"></div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-text">
        © 2026 Likelion Vacation Guestbook Project. Powered by React + TS + Supabase
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Write Modal */}
      {isWriteOpen && (
        <div className="modal-overlay" onClick={() => setIsWriteOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>새 방명록 남기기</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setIsWriteOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">닉네임</label>
                <input
                  type="text"
                  maxLength={20}
                  className="form-input"
                  placeholder="닉네임을 입력해 주세요"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">이모지 선택</label>
                <div className="emoji-choices">
                  {EMOJI_CHOICES.map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${emoji === em ? 'selected' : ''}`}
                      onClick={() => setEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">포스트잇 색상</label>
                <div className="color-picker">
                  {COLOR_CHOICES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-option ${c.value} ${color === c.value ? 'selected' : ''}`}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">메시지 내용</label>
                <textarea
                  className="form-textarea"
                  maxLength={200}
                  placeholder="따뜻한 한마디를 남겨주세요 (최대 200자)"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">비밀번호 (선택)</label>
                <input
                  type="password"
                  maxLength={10}
                  className="form-input"
                  placeholder="수정/삭제 시 사용할 비밀번호"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <span className="form-help">비밀번호를 입력하지 않으면 누구나 수정/삭제할 수 있습니다.</span>
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsWriteOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Modal */}
      {isEditOpen && (
        <div className="modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>방명록 수정하기</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setIsEditOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">닉네임</label>
                <input
                  type="text"
                  maxLength={20}
                  className="form-input"
                  placeholder="닉네임을 입력해 주세요"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">이모지 선택</label>
                <div className="emoji-choices">
                  {EMOJI_CHOICES.map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${emoji === em ? 'selected' : ''}`}
                      onClick={() => setEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">포스트잇 색상</label>
                <div className="color-picker">
                  {COLOR_CHOICES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-option ${c.value} ${color === c.value ? 'selected' : ''}`}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">메시지 내용</label>
                <textarea
                  className="form-textarea"
                  maxLength={200}
                  placeholder="따뜻한 한마디를 남겨주세요 (최대 200자)"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">비밀번호 변경 (선택)</label>
                <input
                  type="password"
                  maxLength={10}
                  className="form-input"
                  placeholder="비밀번호 수정 시 입력"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Password Verification Prompt Modal */}
      {isPasswordPromptOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordPromptOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>비밀번호 확인</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setIsPasswordPromptOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePasswordVerify} className="modal-form">
              <div className="form-group">
                <label className="form-label">작성 시 설정한 비밀번호를 입력해 주세요.</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="비밀번호 입력"
                  value={promptPasswordInput}
                  onChange={e => setPromptPasswordInput(e.target.value)}
                  autoFocus
                />
                {promptPasswordError && <p className="form-error">{promptPasswordError}</p>}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsPasswordPromptOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Simple Confirm Delete Modal (For cards without passwords) */}
      {isSimpleDeleteOpen && (
        <div className="modal-overlay" onClick={() => setIsSimpleDeleteOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>방명록 삭제</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setIsSimpleDeleteOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                정말로 이 방명록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsSimpleDeleteOpen(false)}
                >
                  취소
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ background: '#ef4444', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)' }}
                  onClick={() => activeEntry && executeDelete(activeEntry.id)}
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Banner */}
      {toast && (
        <div className="alert-toast">
          <Smile size={16} />
          <span>{toast.message}</span>
        </div>
      )}
    </>
  )
}

export default App
