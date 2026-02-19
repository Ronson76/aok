import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if targetEnvironment(macCatalyst)
        configureMacCatalyst()
        #endif
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    #if targetEnvironment(macCatalyst)
    private func configureMacCatalyst() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            let minSize = CGSize(width: 375, height: 667)
            let maxSize = CGSize(width: 1400, height: 1000)
            windowScene.sizeRestrictions?.minimumSize = minSize
            windowScene.sizeRestrictions?.maximumSize = maxSize

            if let titlebar = windowScene.titlebar {
                titlebar.titleVisibility = .visible
                titlebar.toolbar = nil
            }
        }
    }

    override func buildMenu(with builder: any UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == .main else { return }

        builder.remove(menu: .format)
        builder.remove(menu: .toolbar)
    }
    #endif

}
