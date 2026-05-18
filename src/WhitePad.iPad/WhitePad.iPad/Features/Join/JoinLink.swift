import Foundation

struct JoinLink: Equatable, Identifiable {
    var id: String { "\(serverBaseURL.absoluteString)|\(roomId)|\(joinToken)" }
    let serverBaseURL: URL
    let roomId: String
    let joinToken: String
    let sourceURL: URL?
}
