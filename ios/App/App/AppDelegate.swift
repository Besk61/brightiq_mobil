import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        Messaging.messaging().isAutoInitEnabled = true
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application changes from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources and save user data.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if DEBUG
        print("[FCM] APNs token registered as sandbox")
        Messaging.messaging().setAPNSToken(deviceToken, type: .sandbox)
        #else
        print("[FCM] APNs token registered as production")
        Messaging.messaging().setAPNSToken(deviceToken, type: .prod)
        #endif

        // Make sure Firebase has produced the FCM token before Capacitor emits
        // the registration event. The React side then automatically sends that
        // FCM token to /api/auth/set-device-token on login and app startup.
        Messaging.messaging().token { token, error in
            if let error = error {
                print("[FCM] Automatic token fetch failed: \(error.localizedDescription)")
            } else if let token = token {
                print("[FCM] Automatic token ready: \(token)")
            } else {
                print("[FCM] Automatic token fetch returned nil")
            }

            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .capacitorDidRegisterForRemoteNotifications,
                    object: deviceToken
                )
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let fcmToken = fcmToken {
            print("[FCM] Firebase didReceiveRegistrationToken: \(fcmToken)")
        } else {
            print("[FCM] Firebase didReceiveRegistrationToken returned nil")
        }
    }
}
