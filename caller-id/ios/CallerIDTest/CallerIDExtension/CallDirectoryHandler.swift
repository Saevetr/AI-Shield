import Foundation
import CallKit

struct CallerEntry: Codable {
    let phoneNumber: Int64
    let label: String
}

struct CallerListResponse: Codable {
    let success: Bool
    let total: Int
    let updatedAt: String
    let data: [CallerEntry]
}

class CallDirectoryHandler: CXCallDirectoryProvider {

    override func beginRequest(
        with context: CXCallDirectoryExtensionContext
    ) {
        context.delegate = self

        do {
            guard let folder = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier:
                "group.com.aishield.CallerIDTest"
            ) else {
                throw NSError(
                    domain: "AIShield",
                    code: 1,
                    userInfo: [
                        NSLocalizedDescriptionKey:
                        "無法取得共享容器"
                    ]
                )
            }

            let fileURL = folder.appendingPathComponent(
                "callerList.json"
            )

            let data = try Data(contentsOf: fileURL)

            let result = try JSONDecoder().decode(
                CallerListResponse.self,
                from: data
            )

            var uniqueEntries: [Int64: String] = [:]

            for entry in result.data {
                if entry.phoneNumber > 0 {
                    uniqueEntries[entry.phoneNumber] = entry.label
                }
            }

            if context.isIncremental {
                context.removeAllIdentificationEntries()
                context.removeAllBlockingEntries()
            }

            for number in uniqueEntries.keys.sorted() {
                context.addIdentificationEntry(
                    withNextSequentialPhoneNumber: number,
                    label: uniqueEntries[number]!
                )
            }

            context.completeRequest()

        } catch {
            context.cancelRequest(withError: error)
        }
    }
}

extension CallDirectoryHandler:
    CXCallDirectoryExtensionContextDelegate {

    func requestFailed(
        for extensionContext: CXCallDirectoryExtensionContext,
        withError error: Error
    ) {
        print("來電辨識載入失敗：\(error)")
    }
}
