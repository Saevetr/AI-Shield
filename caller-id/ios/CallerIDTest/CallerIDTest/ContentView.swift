import CallKit
import SwiftUI
import Foundation

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

struct ContentView: View {

    @State private var status = "尚未同步"
    @State private var total = 0
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 25) {

            Image(systemName: "shield.checkered")
                .font(.system(size: 65))
                .foregroundStyle(.blue)

            Text("AI Shield")
                .font(.largeTitle)
                .bold()

            Text("來電辨識系統")
                .font(.title2)

            Text("已下載電話數量")
                .foregroundStyle(.secondary)

            Text("\(total) 筆")
                .font(.system(size: 42))
                .bold()
                .foregroundStyle(.blue)

            Text(status)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    await syncCallerList()
                }
            } label: {
                Text(isLoading ? "同步中..." : "同步電話資料庫")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
            }
            .disabled(isLoading)
        }
        .padding(30)
    }

    @MainActor
    func syncCallerList() async {

        isLoading = true
        status = "正在連線至伺服器..."

        defer {
            isLoading = false
        }

        guard let url = URL(
            string: "http://192.168.1.28:3001/api/caller-id/list"
        ) else {
            status = "API 網址錯誤"
            return
        }

        do {
            let (data, response) =
                try await URLSession.shared.data(from: url)

            guard let http = response as? HTTPURLResponse,
                  http.statusCode == 200 else {
                status = "伺服器回應錯誤"
                return
            }

            let result = try JSONDecoder().decode(
                CallerListResponse.self,
                from: data
            )

            guard result.success else {
                status = "資料庫查詢失敗"
                return
            }

            guard let folder = FileManager.default
                .containerURL(
                    forSecurityApplicationGroupIdentifier:
                    "group.com.aishield.CallerIDTest"
                ) else {
                status = "無法取得 App Group 共享容器"
                return
            }

            let fileURL = folder.appendingPathComponent(
                "callerList.json"
            )

            try data.write(to: fileURL, options: .atomic)

            total = result.data.count

            do {
                try await CXCallDirectoryManager.sharedInstance
                    .reloadExtension(
                        withIdentifier:
                        "com.aishield.CallerIDTest.CallerIDExtension"
                    )

                status = "同步成功！已更新來電辨識清單"

            } catch {
                status = "資料已下載，但來電辨識更新失敗：\(error.localizedDescription)"
            }

        } catch {
            status = "同步失敗：\(error.localizedDescription)"
        }
    }
}

#Preview {
    ContentView()
}
