import Foundation
import AVFoundation
import Capacitor

@objc(CustomNotificationSoundPlugin)
public class CustomNotificationSoundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CustomNotificationSoundPlugin"
    public let jsName = "CustomNotificationSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "installSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previewSound", returnType: CAPPluginReturnPromise)
    ]

    private var previewPlayer: AVAudioPlayer?

    @objc func installSound(_ call: CAPPluginCall) {
        guard let soundId = call.getString("soundId"),
              soundId.range(of: "^custom_[a-z0-9_]{1,50}$", options: .regularExpression) != nil,
              let base64 = call.getString("base64"),
              let audio = Data(base64Encoded: base64),
              isWaveFile(audio) else {
            call.reject("Geçersiz WAV ses dosyası.")
            return
        }

        do {
            let directory = try soundsDirectory()
            let destination = directory.appendingPathComponent(soundId + ".wav")
            try audio.write(to: destination, options: .atomic)
            call.resolve(["soundId": soundId])
        } catch {
            call.reject("Özel ses kurulamadı: \(error.localizedDescription)", nil, error)
        }
    }

    @objc func previewSound(_ call: CAPPluginCall) {
        guard let soundId = call.getString("soundId"),
              soundId.range(of: "^custom_[a-z0-9_]{1,50}$", options: .regularExpression) != nil else {
            call.reject("Geçersiz özel ses.")
            return
        }

        do {
            let file = try soundsDirectory().appendingPathComponent(soundId + ".wav")
            guard FileManager.default.fileExists(atPath: file.path) else {
                call.reject("Özel ses bu cihazda bulunamadı.")
                return
            }
            previewPlayer = try AVAudioPlayer(contentsOf: file)
            previewPlayer?.prepareToPlay()
            previewPlayer?.play()
            call.resolve()
        } catch {
            call.reject("Özel ses oynatılamadı: \(error.localizedDescription)", nil, error)
        }
    }

    private func soundsDirectory() throws -> URL {
        let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0]
        let directory = library.appendingPathComponent("Sounds", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    private func isWaveFile(_ data: Data) -> Bool {
        guard data.count > 12 else { return false }
        return String(data: data[0..<4], encoding: .ascii) == "RIFF"
            && String(data: data[8..<12], encoding: .ascii) == "WAVE"
    }
}