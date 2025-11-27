// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract TurnaroundBadge is ERC721, Ownable {
    using Strings for uint256;
    using Strings for uint8;

    uint256 public nextTokenId;
    address public checklistContract;

    // turnaroundId => actorId (0..5) => ya tiene badge?
    mapping(uint256 => mapping(uint8 => bool)) public hasBadge;

    // Info específica del badge
    struct BadgeInfo {
        uint256 turnaroundId;
        uint8 actorId; // 0..5, mapea con Actor del checklist
    }

    // tokenId => info
    mapping(uint256 => BadgeInfo) public badgeInfo;

    constructor(
        address initialOwner
    ) ERC721("Turnaround Badge", "TAB") Ownable(initialOwner) {}

    // ---------------- CONFIG ----------------

    function setChecklistContract(address _checklist) external onlyOwner {
        checklistContract = _checklist;
    }

    // ---------------- MINT ----------------

    /// @notice Sólo el contrato de checklist puede mintear badges
    function mintBadge(
        address to,
        uint256 turnaroundId,
        uint8 actorId
    ) external {
        require(msg.sender == checklistContract, "Not authorized");
        require(!hasBadge[turnaroundId][actorId], "Badge already minted");

        uint256 tokenId = nextTokenId++;
        hasBadge[turnaroundId][actorId] = true;

        badgeInfo[tokenId] = BadgeInfo({
            turnaroundId: turnaroundId,
            actorId: actorId
        });

        _safeMint(to, tokenId);
    }

    // ---------------- METADATA VIEW ----------------

    function _actorName(uint8 actorId) internal pure returns (string memory) {
        if (actorId == 0) return "GroundHandling";
        if (actorId == 1) return "Cleaning";
        if (actorId == 2) return "Fuel";
        if (actorId == 3) return "Catering";
        if (actorId == 4) return "FlightCrew";
        if (actorId == 5) return "Gate";
        return "Unknown";
    }

    /// @notice tokenURI on-chain: devuelve JSON + imagen SVG embebida
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        // OpenZeppelin v5: usamos _ownerOf en vez de _exists
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721Metadata: URI query for nonexistent token"
        );

        BadgeInfo memory info = badgeInfo[tokenId];

        string memory actorName = _actorName(info.actorId);
        string memory tokenIdStr = tokenId.toString();
        string memory turnaroundIdStr = info.turnaroundId.toString();

        // Imagen SVG simple, generada on-chain
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
                '<rect width="100%" height="100%" fill="#0b1020"/>',
                '<text x="50%" y="30%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="22">Turnaround Badge</text>',
                '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#00e5ff" font-size="16">Actor: ',
                actorName,
                "</text>",
                '<text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="14">Turnaround #',
                turnaroundIdStr,
                "</text>",
                '<text x="50%" y="80%" dominant-baseline="middle" text-anchor="middle" fill="#888888" font-size="12">Token #',
                tokenIdStr,
                "</text>",
                "</svg>"
            )
        );

        string memory image = string(
            abi.encodePacked(
                "data:image/svg+xml;base64,",
                Base64.encode(bytes(svg))
            )
        );

        // JSON de metadata como tú lo querías (adaptado)
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Turnaround Badge #',
                tokenIdStr,
                '",',
                '"description":"Badge for ',
                actorName,
                " in Turnaround #",
                turnaroundIdStr,
                '",',
                '"image":"',
                image,
                '",',
                '"attributes":[',
                '{"trait_type":"turnaroundId","value":',
                turnaroundIdStr,
                "},",
                '{"trait_type":"actor","value":"',
                actorName,
                '"}',
                "]",
                "}"
            )
        );

        // Devolvemos data:application/json;base64,...
        string memory jsonBase64 = Base64.encode(bytes(json));
        return
            string(
                abi.encodePacked("data:application/json;base64,", jsonBase64)
            );
    }

    /// @notice Helper por si lo quieres usar desde el front
    function getBadgeDetails(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 turnaroundId,
            uint8 actorId,
            address owner,
            address checklist
        )
    {
        // ownerOf ya revierte si el token no existe en OZ v5
        BadgeInfo memory info = badgeInfo[tokenId];
        turnaroundId = info.turnaroundId;
        actorId = info.actorId;
        owner = ownerOf(tokenId);
        checklist = checklistContract;
    }
}
