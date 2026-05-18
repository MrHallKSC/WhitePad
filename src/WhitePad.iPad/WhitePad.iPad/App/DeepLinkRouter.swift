import Foundation

struct DeepLinkRouter {
    func parse(_ rawValue: String) throws -> JoinLink {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw WhitePadError.invalidJoinLink("Enter a valid WhitePad join URL.")
        }

        switch components.scheme?.lowercased() {
        case "http", "https":
            return try parseWebJoinURL(url, components: components)
        case "whitepad":
            return try parseCustomScheme(components)
        default:
            throw WhitePadError.invalidJoinLink("WhitePad links must start with https:// or whitepad://.")
        }
    }

    private func parseWebJoinURL(_ url: URL, components: URLComponents) throws -> JoinLink {
        let roomId = queryValue(named: "roomId", in: components)
            ?? queryValue(named: "room", in: components)
        let token = queryValue(named: "token", in: components)

        guard let roomId, !roomId.isEmpty else {
            throw WhitePadError.invalidJoinLink("The join link is missing a room ID.")
        }

        guard let token, !token.isEmpty else {
            throw WhitePadError.invalidJoinLink("The join link is missing a room token.")
        }

        guard let scheme = components.scheme,
              let host = components.host else {
            throw WhitePadError.invalidJoinLink("The join link is missing a server host.")
        }

        var serverComponents = URLComponents()
        serverComponents.scheme = scheme
        serverComponents.host = host
        serverComponents.port = components.port

        guard let serverBaseURL = serverComponents.url else {
            throw WhitePadError.invalidJoinLink("The server address is not valid.")
        }

        return JoinLink(serverBaseURL: serverBaseURL, roomId: roomId, joinToken: token, sourceURL: url)
    }

    private func parseCustomScheme(_ components: URLComponents) throws -> JoinLink {
        let roomId = queryValue(named: "roomId", in: components)
            ?? queryValue(named: "room", in: components)
        let token = queryValue(named: "token", in: components)
        let server = queryValue(named: "server", in: components)

        guard components.host?.lowercased() == "join" else {
            throw WhitePadError.invalidJoinLink("The app link must use whitepad://join.")
        }

        guard let roomId, !roomId.isEmpty else {
            throw WhitePadError.invalidJoinLink("The app link is missing a room ID.")
        }

        guard let token, !token.isEmpty else {
            throw WhitePadError.invalidJoinLink("The app link is missing a room token.")
        }

        guard let server,
              let serverBaseURL = URL(string: server) else {
            throw WhitePadError.invalidJoinLink("The app link is missing a valid server address.")
        }

        return JoinLink(serverBaseURL: serverBaseURL, roomId: roomId, joinToken: token, sourceURL: components.url)
    }

    private func queryValue(named name: String, in components: URLComponents) -> String? {
        components.queryItems?.first { $0.name == name }?.value
    }
}
