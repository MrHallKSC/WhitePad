enum SessionPhase {
    case idle
    case resolvingJoinLink(JoinLink)
    case joined(StudentRoomSession)
    case failed(WhitePadError)
}
