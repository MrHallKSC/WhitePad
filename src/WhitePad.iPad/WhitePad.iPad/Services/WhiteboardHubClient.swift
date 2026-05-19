import Foundation

@MainActor
protocol WhiteboardHubClientProtocol: AnyObject {
    var onStudentLocked: ((StudentLocked) -> Void)? { get set }
    var onWaitingRoomStateChanged: ((WaitingRoomStateChanged) -> Void)? { get set }
    var onQuestionChanged: ((QuestionChanged) -> Void)? { get set }
    var onBoardCleared: ((BoardCleared) -> Void)? { get set }
    var onKicked: (() -> Void)? { get set }

    func startListening()
    func joinFromWaitingRoom() async throws
    func setAnswered(_ hasAnswered: Bool) async throws
    func setConfidence(_ confidenceLevel: String) async throws
    func sendStrokeBatch(_ batch: StrokeBatch) async throws
    func undoStroke(_ strokeId: String) async throws
    func clearBoard() async throws
    func stop()
}

@MainActor
final class WhiteboardHubClient: WhiteboardHubClientProtocol {
    private static let recordSeparator = "\u{1e}"

    private let serverBaseURL: URL
    private let session: URLSession
    private let decoder = JSONDecoder()
    private var webSocketTask: URLSessionWebSocketTask?
    private var nextInvocationId = 1
    private var listenTask: Task<Void, Never>?

    var onStudentLocked: ((StudentLocked) -> Void)?
    var onWaitingRoomStateChanged: ((WaitingRoomStateChanged) -> Void)?
    var onQuestionChanged: ((QuestionChanged) -> Void)?
    var onBoardCleared: ((BoardCleared) -> Void)?
    var onKicked: (() -> Void)?

    init(serverBaseURL: URL, session: URLSession = .shared) {
        self.serverBaseURL = serverBaseURL
        self.session = session
    }

    func joinRoom(roomId: String, joinToken: String, displayName: String) async throws -> JoinRoomResponse {
        try await connect()

        let invocationId = String(nextInvocationId)
        nextInvocationId += 1

        let message = SignalRInvocationMessage(
            invocationId: invocationId,
            target: "JoinRoomAsStudent",
            arguments: [roomId, joinToken, displayName]
        )
        try await send(message)

        while true {
            let completion = try await receiveCompletion()
            guard completion.invocationId == invocationId else { continue }

            if let error = completion.error {
                throw WhitePadError.connectionFailed(error)
            }

            guard let result = completion.result else {
                throw WhitePadError.connectionFailed("The server returned an empty join response.")
            }

            return try decoder.decode(JoinRoomResponse.self, from: result)
        }
    }

    func stop() {
        listenTask?.cancel()
        listenTask = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }

    func startListening() {
        listenTask?.cancel()
        listenTask = Task { [weak self] in
            guard let self else { return }

            do {
                while !Task.isCancelled {
                    for record in try await receiveRecords() {
                        try await handleIncomingRecord(record)
                    }
                }
            } catch {
                if !Task.isCancelled {
                    stop()
                }
            }
        }
    }

    func joinFromWaitingRoom() async throws {
        try await sendInvocation(target: "JoinFromWaitingRoom")
    }

    func setAnswered(_ hasAnswered: Bool) async throws {
        try await sendInvocation(target: "SetAnswered", arguments: [JSONValue.bool(hasAnswered)])
    }

    func setConfidence(_ confidenceLevel: String) async throws {
        try await sendInvocation(target: "SetConfidence", arguments: [JSONValue.string(confidenceLevel)])
    }

    func sendStrokeBatch(_ batch: StrokeBatch) async throws {
        try await sendInvocation(target: "SendStrokeBatch", arguments: [batch])
    }

    func undoStroke(_ strokeId: String) async throws {
        try await sendInvocation(target: "UndoStroke", arguments: [JSONValue.string(strokeId)])
    }

    func clearBoard() async throws {
        try await sendInvocation(target: "ClearBoard")
    }

    private func connect() async throws {
        if webSocketTask != nil { return }

        let negotiateResponse = try await negotiate()
        let webSocketURL = try makeWebSocketURL(connectionToken: negotiateResponse.connectionToken)
        let task = session.webSocketTask(with: webSocketURL)
        webSocketTask = task
        task.resume()

        try await sendHandshake()
        try await receiveHandshake()
    }

    private func negotiate() async throws -> NegotiateResponse {
        let url = try makeNegotiateURL()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        request.httpBody = Data()

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw WhitePadError.connectionFailed("Could not reach the WhitePad server.")
        }

        return try decoder.decode(NegotiateResponse.self, from: data)
    }

    private func sendHandshake() async throws {
        let handshake = #"{"protocol":"json","version":1}"# + Self.recordSeparator
        try await sendRaw(handshake)
    }

    private func receiveHandshake() async throws {
        while true {
            let records = try await receiveRecords()
            if records.contains(where: { $0 == "{}" }) {
                return
            }
        }
    }

    private func receiveCompletion() async throws -> SignalRCompletionMessage {
        while true {
            for record in try await receiveRecords() {
                guard let data = record.data(using: .utf8),
                      let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      envelope["type"] as? Int == 3 else {
                    continue
                }

                return try decoder.decode(SignalRCompletionMessage.self, from: data)
            }
        }
    }

    private func send(_ message: SignalRInvocationMessage<String>) async throws {
        let data = try JSONEncoder().encode(message)
        guard let json = String(data: data, encoding: .utf8) else {
            throw WhitePadError.connectionFailed("Could not encode SignalR message.")
        }

        try await sendRaw(json + Self.recordSeparator)
    }

    private func sendInvocation<Argument: Encodable>(target: String, arguments: [Argument]) async throws {
        try await sendRaw(makeInvocationRecord(target: target, arguments: arguments))
    }

    private func sendInvocation(target: String) async throws {
        try await sendRaw(makeInvocationRecord(target: target, arguments: [JSONValue]()))
    }

    func makeInvocationRecord<Argument: Encodable>(target: String, arguments: [Argument]) throws -> String {
        let message = SignalRInvocationMessage<JSONValue>(
            target: target,
            arguments: arguments.map(JSONValue.encodable)
        )
        let data = try JSONEncoder().encode(message)
        guard let json = String(data: data, encoding: .utf8) else {
            throw WhitePadError.connectionFailed("Could not encode SignalR message.")
        }

        return json + Self.recordSeparator
    }

    func makeInvocationRecord(target: String) throws -> String {
        let message = SignalRInvocationMessage<JSONValue>(
            target: target,
            arguments: []
        )
        let data = try JSONEncoder().encode(message)
        guard let json = String(data: data, encoding: .utf8) else {
            throw WhitePadError.connectionFailed("Could not encode SignalR message.")
        }

        return json + Self.recordSeparator
    }

    private func sendRaw(_ message: String) async throws {
        guard let webSocketTask else {
            throw WhitePadError.connectionFailed("The SignalR connection is not open.")
        }

        try await webSocketTask.send(.string(message))
    }

    private func receiveRecords() async throws -> [String] {
        guard let webSocketTask else {
            throw WhitePadError.connectionFailed("The SignalR connection is not open.")
        }

        let message = try await webSocketTask.receive()
        let text: String

        switch message {
        case .string(let value):
            text = value
        case .data(let data):
            text = String(decoding: data, as: UTF8.self)
        @unknown default:
            throw WhitePadError.connectionFailed("The server sent an unsupported SignalR message.")
        }

        return text
            .split(separator: Character(Self.recordSeparator), omittingEmptySubsequences: true)
            .map(String.init)
    }

    private func makeNegotiateURL() throws -> URL {
        guard var components = URLComponents(url: serverBaseURL, resolvingAgainstBaseURL: false) else {
            throw WhitePadError.connectionFailed("The server address is not valid.")
        }

        components.path = "/hub/whiteboard/negotiate"
        components.queryItems = [
            URLQueryItem(name: "negotiateVersion", value: "1")
        ]

        guard let url = components.url else {
            throw WhitePadError.connectionFailed("Could not build the SignalR negotiate URL.")
        }

        return url
    }

    private func makeWebSocketURL(connectionToken: String) throws -> URL {
        guard var components = URLComponents(url: serverBaseURL, resolvingAgainstBaseURL: false) else {
            throw WhitePadError.connectionFailed("The server address is not valid.")
        }

        switch components.scheme?.lowercased() {
        case "http":
            components.scheme = "ws"
        case "https":
            components.scheme = "wss"
        default:
            throw WhitePadError.connectionFailed("WhitePad server links must use http or https.")
        }

        components.path = "/hub/whiteboard"
        components.queryItems = [
            URLQueryItem(name: "id", value: connectionToken)
        ]

        guard let url = components.url else {
            throw WhitePadError.connectionFailed("Could not build the SignalR WebSocket URL.")
        }

        return url
    }

    func handleIncomingRecord(_ record: String) async throws {
        guard let data = record.data(using: .utf8),
              let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              envelope["type"] as? Int == 1 else {
            return
        }

        let message = try decoder.decode(SignalRClientInvocationMessage.self, from: data)

        switch message.target.lowercased() {
        case "studentlocked":
            if let payload = message.arguments.first {
                onStudentLocked?(try decoder.decode(StudentLocked.self, from: payload))
            }
        case "waitingroomstatechanged":
            if let payload = message.arguments.first {
                onWaitingRoomStateChanged?(try decoder.decode(WaitingRoomStateChanged.self, from: payload))
            }
        case "questionchanged":
            if let payload = message.arguments.first {
                onQuestionChanged?(try decoder.decode(QuestionChanged.self, from: payload))
            }
        case "boardcleared":
            if let payload = message.arguments.first {
                onBoardCleared?(try decoder.decode(BoardCleared.self, from: payload))
            }
        case "kicked":
            onKicked?()
        default:
            return
        }
    }
}

private struct NegotiateResponse: Decodable {
    let connectionToken: String
}

private struct SignalRInvocationMessage<Argument: Encodable>: Encodable {
    let type = 1
    var invocationId: String? = nil
    let target: String
    let arguments: [Argument]
}

private struct SignalRClientInvocationMessage: Decodable {
    let type: Int
    let target: String
    let arguments: [Data]

    private enum CodingKeys: String, CodingKey {
        case type
        case target
        case arguments
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decode(Int.self, forKey: .type)
        target = try container.decode(String.self, forKey: .target)

        var argumentsContainer = try container.nestedUnkeyedContainer(forKey: .arguments)
        var decodedArguments: [Data] = []
        while !argumentsContainer.isAtEnd {
            let argumentDecoder = try argumentsContainer.superDecoder()
            decodedArguments.append(try argumentDecoder.encodedData())
        }
        arguments = decodedArguments
    }
}

private struct SignalRCompletionMessage: Decodable {
    let type: Int
    let invocationId: String?
    let result: Data?
    let error: String?

    private enum CodingKeys: String, CodingKey {
        case type
        case invocationId
        case result
        case error
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decode(Int.self, forKey: .type)
        invocationId = try container.decodeIfPresent(String.self, forKey: .invocationId)
        error = try container.decodeIfPresent(String.self, forKey: .error)

        if container.contains(.result) {
            result = try container.superDecoder(forKey: .result).encodedData()
        } else {
            result = nil
        }
    }
}

private extension Decoder {
    func encodedData() throws -> Data {
        let value = try JSONValue(from: self)
        return try JSONEncoder().encode(value)
    }
}

private enum JSONValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    static func encodable(_ value: some Encodable) -> JSONValue {
        if let value = value as? JSONValue {
            return value
        }

        guard let data = try? JSONEncoder().encode(value),
              let decodedValue = try? JSONDecoder().decode(JSONValue.self, from: data) else {
            return .null
        }

        return decodedValue
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .string(let value):
            try container.encode(value)
        case .number(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}
