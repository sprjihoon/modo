export default function CustomerLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">모두의수선</h1>

        <p className="text-gray-600 mb-8">
          이 페이지는 비밀번호 재설정 등<br />
          인증 관련 기능을 위한 페이지입니다.
        </p>

        <div className="bg-gray-100 rounded-lg p-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">안내</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">•</span>
              비밀번호 재설정 링크는 이메일로 발송됩니다.
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">•</span>
              모두의수선 앱에서 서비스를 이용해주세요.
            </li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          모두의수선 | 수선의 모든 것
        </p>
      </div>
    </div>
  );
}
