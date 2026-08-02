import { useState } from 'react'
import { saveTmdbCredential, testTmdbConnection } from '../services/tmdb'

interface Props {
  open: boolean
  initialCredential: string
  onClose: () => void
  onConfigured: (credential: string) => void
}

export function DatabaseSetupModal({ open, initialCredential, onClose, onConfigured }: Props) {
  const [credential, setCredential] = useState(initialCredential)
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  if (!open) return null

  const connect = async () => {
    if (!credential.trim()) { setStatus('error'); setMessage('请先填写 API Key 或 Read Access Token。'); return }
    setStatus('testing'); setMessage('正在连接 TMDB…')
    try {
      await testTmdbConnection(credential.trim())
      saveTmdbCredential(credential.trim())
      onConfigured(credential.trim())
      setStatus('success'); setMessage('连接成功，电影资料将从 TMDB 实时获取。')
      window.setTimeout(onClose, 700)
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '连接失败，请检查凭证。')
    }
  }

  const disconnect = () => {
    saveTmdbCredential('')
    setCredential('')
    onConfigured('')
    setStatus('idle')
    setMessage('已切换为本地离线题库。')
  }

  return <div className="modal-backdrop database-backdrop" role="dialog" aria-modal="true" aria-labelledby="database-title">
    <div className="database-modal">
      <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
      <span className="section-index">REAL-TIME MOVIE DATA</span>
      <h2 id="database-title">连接 TMDB</h2>
      <p>使用 TMDB v3 API Key 或 v4 Read Access Token。凭证只保存在当前浏览器，不会写入题库或上传到其他服务。</p>
      <label htmlFor="tmdb-credential">API Key / Read Access Token</label>
      <input id="tmdb-credential" type="password" value={credential} onChange={(event) => setCredential(event.target.value)} placeholder="粘贴你的 TMDB 凭证" autoComplete="off" />
      <div className={`connection-message ${status}`}>{message || '连接后，片单、海报、简介、导演、演员和评分将在每场测试开始时刷新。'}</div>
      <div className="database-actions">
        <button className="primary-button" onClick={connect} disabled={status === 'testing'}>{status === 'testing' ? '正在验证…' : '验证并连接'}</button>
        {initialCredential && <button className="secondary-button" onClick={disconnect}>断开连接</button>}
      </div>
      <div className="credential-help">
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">前往 TMDB 申请免费凭证 ↗</a>
        <small>公开部署前建议通过服务端代理保护凭证；TMDB 非商业开发者 API 需要来源署名。</small>
      </div>
    </div>
  </div>
}
