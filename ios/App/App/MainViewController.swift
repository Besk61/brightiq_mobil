import Capacitor

@objc(MainViewController)
public class MainViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CustomNotificationSoundPlugin())
    }
}