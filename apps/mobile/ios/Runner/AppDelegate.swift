import Flutter
import UIKit
import FirebaseCore

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // ⚠️ 중요: Firebase는 반드시 플러그인 등록 전에 초기화해야 함
    // Firebase Auth 플러그인이 OAuth 콜백을 처리할 때 Firebase가 필요함
    if FirebaseApp.app() == nil {
      // GoogleService-Info.plist에서 명시적으로 옵션 로드
      if let filePath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
         let options = FirebaseOptions(contentsOfFile: filePath) {
        FirebaseApp.configure(options: options)
        print("✅ Firebase 초기화 성공")
      } else {
        print("⚠️ GoogleService-Info.plist를 찾을 수 없음")
        // 파일이 없어도 앱 실행은 계속 (카카오 로그인은 Firebase 없이 동작)
      }
    }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
