import XCTest
@testable import WhitePad_iPad

final class DeepLinkRouterTests: XCTestCase {
    private let router = DeepLinkRouter()

    func testParsesWebJoinLinkWithRoomId() throws {
        let link = try router.parse("http://localhost:5173/join?roomId=room-123&token=ABC123")

        XCTAssertEqual(link.serverBaseURL.absoluteString, "http://localhost:5173")
        XCTAssertEqual(link.roomId, "room-123")
        XCTAssertEqual(link.joinToken, "ABC123")
    }

    func testParsesLegacyRoomQueryName() throws {
        let link = try router.parse("https://whitepad.local:5001/join?room=legacy-room&token=TOKEN")

        XCTAssertEqual(link.serverBaseURL.absoluteString, "https://whitepad.local:5001")
        XCTAssertEqual(link.roomId, "legacy-room")
        XCTAssertEqual(link.joinToken, "TOKEN")
    }

    func testParsesCustomSchemeJoinLink() throws {
        let link = try router.parse("whitepad://join?roomId=room-123&token=ABC123&server=http%3A%2F%2F192.168.1.20%3A5173")

        XCTAssertEqual(link.serverBaseURL.absoluteString, "http://192.168.1.20:5173")
        XCTAssertEqual(link.roomId, "room-123")
        XCTAssertEqual(link.joinToken, "ABC123")
    }

    func testRejectsMissingRoomId() {
        XCTAssertThrowsError(try router.parse("http://localhost:5173/join?token=ABC123")) { error in
            XCTAssertEqual((error as? WhitePadError)?.message, "The join link is missing a room ID.")
        }
    }

    func testRejectsMissingToken() {
        XCTAssertThrowsError(try router.parse("http://localhost:5173/join?roomId=room-123")) { error in
            XCTAssertEqual((error as? WhitePadError)?.message, "The join link is missing a room token.")
        }
    }

    func testRejectsCustomSchemeWithoutServer() {
        XCTAssertThrowsError(try router.parse("whitepad://join?roomId=room-123&token=ABC123")) { error in
            XCTAssertEqual((error as? WhitePadError)?.message, "The app link is missing a valid server address.")
        }
    }
}
