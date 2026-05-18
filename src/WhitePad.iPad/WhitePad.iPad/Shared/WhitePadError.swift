enum WhitePadError: Error, Equatable {
    case invalidJoinLink(String)
    case connectionFailed(String)
    case joinRejected(String)

    var message: String {
        switch self {
        case .invalidJoinLink(let message):
            return message
        case .connectionFailed(let message):
            return message
        case .joinRejected(let message):
            return message
        }
    }
}
