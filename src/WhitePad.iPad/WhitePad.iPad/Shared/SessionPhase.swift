enum SessionPhase: Equatable {
    case idle
    case resolvingJoinLink(JoinLink)
    case joined(StudentSession)
    case failed(WhitePadError)
}
