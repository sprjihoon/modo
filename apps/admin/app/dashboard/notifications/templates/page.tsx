'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationTemplate {
  id: string
  template_key: string
  template_name: string
  category: string
  title: string
  body: string
  is_active: boolean
  is_default: boolean
  variables: Array<{ name: string; description: string }>
  created_at: string
  updated_at: string
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('template_key', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('템플릿 로드 실패:', error)
      alert('템플릿을 불러오는 데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingTemplate) return

    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          title: editingTemplate.title,
          body: editingTemplate.body,
          is_active: editingTemplate.is_active,
        })
        .eq('id', editingTemplate.id)

      if (error) throw error

      alert('템플릿이 저장되었습니다')
      setIsModalOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('템플릿 저장 실패:', error)
      alert('템플릿 저장에 실패했습니다')
    }
  }

  const handleToggleActive = async (template: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)

      if (error) throw error
      loadTemplates()
    } catch (error) {
      console.error('활성화 토글 실패:', error)
      alert('상태 변경에 실패했습니다')
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'order_status':
        return '주문 상태'
      case 'extra_charge':
        return '추가 과금'
      case 'announcement':
        return '공지사항'
      default:
        return category
    }
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">알림 템플릿 관리</h1>
        <p className="text-gray-600 mt-2">
          각 액션별 알림 메시지를 커스터마이징할 수 있습니다
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  템플릿 이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  본문 미리보기
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCategoryName(template.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {template.template_name}
                    {template.is_default && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        기본
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">{template.body}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        template.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {template.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 편집 모달 */}
      {isModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                템플릿 편집: {editingTemplate.template_name}
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* 사용 가능한 변수 안내 */}
              {editingTemplate.variables.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    사용 가능한 변수
                  </h4>
                  <div className="space-y-1">
                    {editingTemplate.variables.map((v: any) => (
                      <div key={v.name} className="text-sm text-blue-700">
                        <code className="bg-blue-100 px-2 py-1 rounded">
                          {`{{${v.name}}}`}
                        </code>
                        <span className="ml-2">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={editingTemplate.title}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 본문 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  알림 본문
                </label>
                <textarea
                  value={editingTemplate.body}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, body: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 활성화 여부 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingTemplate.is_active}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      is_active: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  활성화
                </label>
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

