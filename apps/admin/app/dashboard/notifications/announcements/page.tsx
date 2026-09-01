'use client'

import { useState, useEffect } from 'react'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  status: string
  send_push: boolean
  target_audience: string
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  push_sent_count: number
  push_failed_count: number
  image_url: string | null
  link_url: string | null
  is_pinned: boolean
  created_at: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/announcements')
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '공지사항을 불러오는 데 실패했습니다')
      }
      setAnnouncements(json.data || [])
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는 데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingAnnouncement({
      title: '',
      content: '',
      type: 'general',
      status: 'draft',
      send_push: true,
      target_audience: 'all',
      is_pinned: false,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingAnnouncement) return

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnnouncement.id,
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          type: editingAnnouncement.type,
          send_push: editingAnnouncement.send_push,
          target_audience: editingAnnouncement.target_audience,
          is_pinned: editingAnnouncement.is_pinned,
          image_url: editingAnnouncement.image_url || null,
          link_url: editingAnnouncement.link_url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '공지사항 저장에 실패했습니다')
      }

      alert('공지사항이 저장되었습니다')
      setIsModalOpen(false)
      loadAnnouncements()
    } catch (error: any) {
      console.error('공지사항 저장 실패:', error)
      alert(error.message || '공지사항 저장에 실패했습니다')
    }
  }

  const handleSendPush = async (announcement: Announcement) => {
    if (
      !confirm(
        `고객 앱/웹 공지사항에 게시합니다.\n대상: ${getTargetAudienceName(announcement.target_audience)}${
          announcement.send_push ? '\n푸시 알림도 함께 발송됩니다.' : ''
        }`
      )
    ) {
      return
    }

    try {
      setIsSending(true)

      const res = await fetch('/api/admin/announcements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: announcement.id }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || '공지 게시에 실패했습니다')
      }

      alert(data.message)
      loadAnnouncements()
    } catch (error: any) {
      console.error('공지 게시 실패:', error)
      alert(error.message || '공지 게시에 실패했습니다')
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '삭제에 실패했습니다')
      }
      alert('공지사항이 삭제되었습니다')
      loadAnnouncements()
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      sending: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }

    const labels: Record<string, string> = {
      draft: '임시저장',
      scheduled: '예약됨',
      sending: '발송 중',
      sent: '발송 완료',
      failed: '발송 실패',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      general: '일반',
      urgent: '긴급',
      maintenance: '점검',
      promotion: '프로모션',
    }
    return types[type] || type
  }

  const getTargetAudienceName = (audience: string) => {
    const audiences: Record<string, string> = {
      all: '전체 사용자',
      active_users: '활성 사용자 (30일 내)',
      recent_orders: '최근 주문자 (7일 내)',
      quiet_30: '휴면 30일',
      quiet_60: '휴면 60일',
      one_shot: '1회 구매 후 조용',
      abandon: '장바구니 이탈',
      app_only: '앱만 쓰는 고객',
    }
    return audiences[audience] || audience
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">공지사항 관리</h1>
          <p className="text-gray-600 mt-2">공지사항을 작성하고 고객 앱/웹에 게시한 뒤, 필요하면 푸시 알림도 발송할 수 있습니다</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          새 공지사항
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  첨부
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발송 통계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {announcement.is_pinned && (
                      <span className="inline-block mr-2 text-yellow-500">📌</span>
                    )}
                    {announcement.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-1">
                      {announcement.image_url && (
                        <span title="이미지 첨부" className="text-lg">🖼️</span>
                      )}
                      {announcement.link_url && (
                        <span title="링크 첨부" className="text-lg">🔗</span>
                      )}
                      {!announcement.image_url && !announcement.link_url && (
                        <span className="text-gray-300">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTypeName(announcement.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(announcement.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTargetAudienceName(announcement.target_audience)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {announcement.status === 'sent' ? (
                      <div>
                        <div>
                          총 {announcement.total_recipients}명
                        </div>
                        <div className="text-xs text-green-600">
                          성공 {announcement.push_sent_count}
                        </div>
                        {announcement.push_failed_count > 0 && (
                          <div className="text-xs text-red-600">
                            실패 {announcement.push_failed_count}
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      편집
                    </button>
                    {(announcement.status !== 'sent' || announcement.send_push) && (
                      <button
                        onClick={() => handleSendPush(announcement)}
                        disabled={isSending}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        {isSending
                          ? '게시 중...'
                          : announcement.status === 'sent'
                            ? '푸시 재발송'
                            : '게시/발송'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 편집/작성 모달 */}
      {isModalOpen && editingAnnouncement && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingAnnouncement.id ? '공지사항 편집' : '새 공지사항'}
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={editingAnnouncement.title || ''}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="공지사항 제목"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용 *
                </label>
                <textarea
                  value={editingAnnouncement.content || ''}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="공지사항 내용"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 유형 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <select
                    value={editingAnnouncement.type || 'general'}
                    onChange={(e) =>
                      setEditingAnnouncement({ ...editingAnnouncement, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="general">일반</option>
                    <option value="urgent">긴급</option>
                    <option value="maintenance">점검</option>
                    <option value="promotion">프로모션</option>
                  </select>
                </div>

                {/* 대상 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">발송 대상</label>
                  <select
                    value={editingAnnouncement.target_audience || 'all'}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        target_audience: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">전체 사용자</option>
                    <option value="active_users">활성 사용자 (30일 내)</option>
                    <option value="recent_orders">최근 주문자 (7일 내)</option>
                    <option value="quiet_30">휴면 30일</option>
                    <option value="quiet_60">휴면 60일</option>
                    <option value="one_shot">1회 구매 후 조용</option>
                    <option value="abandon">장바구니 이탈</option>
                    <option value="app_only">앱만 쓰는 고객</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">휴면·이탈·앱만은 마케팅 실행 목록과 같습니다</p>
                </div>
              </div>

              {/* 이미지 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL (선택)
                </label>
                <input
                  type="url"
                  value={editingAnnouncement.image_url || ''}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">공지사항에 표시할 이미지 URL을 입력하세요</p>
              </div>

              {/* 링크 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL (선택)
                </label>
                <input
                  type="url"
                  value={editingAnnouncement.link_url || ''}
                  onChange={(e) =>
                    setEditingAnnouncement({ ...editingAnnouncement, link_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com/detail"
                />
                <p className="text-xs text-gray-500 mt-1">&quot;자세히 보기&quot; 버튼을 클릭하면 이동할 URL</p>
              </div>

              {/* 옵션 */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="send_push"
                    checked={editingAnnouncement.send_push || false}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        send_push: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="send_push" className="ml-2 block text-sm text-gray-900">
                    푸시 알림 발송
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={editingAnnouncement.is_pinned || false}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        is_pinned: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_pinned" className="ml-2 block text-sm text-gray-900">
                    상단 고정
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

