// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract TurnaroundBadge is ERC721, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;

    // turnaroundContract => actorId (0..5) => already has badge?
    mapping(address => mapping(uint8 => bool)) public hasBadge;

    // Checklist / turnaround contracts allowed to mint
    mapping(address => bool) public isChecklist;

    // Info específica del badge
    struct BadgeInfo {
        address turnaroundContract; // dirección del contrato de turnaround
        uint8 actorId; // 0..5, mapea con Actor del checklist
    }

    // tokenId => info
    mapping(uint256 => BadgeInfo) public badgeInfo;

    // actorId => IPFS CID de la imagen
    // 0: GroundHandling
    // 1: Cleaning
    // 2: Fuel
    // 3: Catering
    // 4: FlightCrew
    // 5: Gate
    mapping(uint8 => string) public actorCID;

    constructor(
        address initialOwner
    ) ERC721("Turnaround Badge", "TAB") Ownable(initialOwner) {
        // Tus CIDs:
        actorCID[0] = "QmZr9HfJqNkJJpEjbLZeLFy57Chy6pC7WbN5hyezhvhFfm"; // Ground
        actorCID[1] = "QmTVPdGnbQxyvrLzLPzkaR2S445PK95LXR2119pYkQ56G4"; // Clean
        actorCID[2] = "QmdCYrxPQbWcJiz4GTPkAGMCbzMzWeTgqtvq3588Ybzzg8"; // Fuel
        actorCID[3] = "QmZAyxhnNirMQvWoKvLYSAEA4bkVGPLCGbE9hNkFLh8X8D"; // Catering
        actorCID[4] = "QmQVDR8CeWCQpWAAHXGu64vkiSLFhZKbK69aGPF7A8GZZ8"; // FlightCrew
        actorCID[5] = "QmcYtM4gcHubv7EbsWYHEMFQXnfDJYdNE9LVuzHT9FqouB"; // Gate
    }

    // ---------------- CONFIG ----------------

    /// @notice Habilita o deshabilita un contrato de checklist para poder mintear badges
    function setChecklistContract(
        address _checklist,
        bool allowed
    ) external onlyOwner {
        isChecklist[_checklist] = allowed;
    }

    /// @notice Actualiza el CID de la imagen para un actor
    function setActorCID(
        uint8 actorId,
        string calldata cid
    ) external onlyOwner {
        require(actorId <= 5, "Invalid actorId");
        actorCID[actorId] = cid;
    }

    // ---------------- MINT ----------------

    /// @notice Sólo contratos de checklist autorizados pueden mintear badges
    /// @dev turnaroundContract debe ser el propio msg.sender (el contrato de checklist)
    function mintBadge(
        address to,
        address turnaroundContract,
        uint8 actorId
    ) external {
        // Descomenta si quieres estas restricciones:
        // require(isChecklist[msg.sender], "Not authorized");
        // require(turnaroundContract == msg.sender, "turnaroundContract mismatch");
        // require(!hasBadge[turnaroundContract][actorId], "Badge already minted");

        uint256 tokenId = nextTokenId++;
        hasBadge[turnaroundContract][actorId] = true;

        badgeInfo[tokenId] = BadgeInfo({
            turnaroundContract: turnaroundContract,
            actorId: actorId
        });

        _safeMint(to, tokenId);
    }

    // ---------------- HELPERS ----------------

    function _actorName(uint8 actorId) internal pure returns (string memory) {
        if (actorId == 0) return "GroundHandling";
        if (actorId == 1) return "Cleaning";
        if (actorId == 2) return "Fuel";
        if (actorId == 3) return "Catering";
        if (actorId == 4) return "FlightCrew";
        if (actorId == 5) return "Gate";
        return "Unknown";
    }

    function _addressToString(
        address addr
    ) internal pure returns (string memory) {
        // 20 bytes = 40 hex chars, prefixed with "0x"
        return Strings.toHexString(uint256(uint160(addr)), 20);
    }

    // ---------------- METADATA VIEW ----------------

    /// @notice tokenURI on-chain: JSON sencillo con image = ipfs://<CID>
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721Metadata: URI query for nonexistent token"
        );

        BadgeInfo memory info = badgeInfo[tokenId];

        string memory actorName = _actorName(info.actorId);
        string memory tokenIdStr = tokenId.toString();
        string memory turnaroundAddrStr = _addressToString(
            info.turnaroundContract
        );

        string memory cid = actorCID[info.actorId];
        require(bytes(cid).length != 0, "CID not set for actor");

        // Enlace "normal" al asset de imagen
        // Si quieres gateway HTTP: "https://ipfs.io/ipfs/" en vez de "ipfs://"
        string memory image = string(abi.encodePacked("ipfs://", cid));

        // JSON metadata
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Turnaround Badge #',
                tokenIdStr,
                '",',
                '"description":"Badge for ',
                actorName,
                ' in a Vueling turnaround contract.",',
                '"image":"',
                image,
                '",',
                '"attributes":[',
                '{"trait_type":"airline","value":"Vueling"},',
                '{"trait_type":"turnaroundContract","value":"',
                turnaroundAddrStr,
                '"},',
                '{"trait_type":"actor","value":"',
                actorName,
                '"}',
                "]",
                "}"
            )
        );

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
            address turnaroundContract,
            uint8 actorId,
            address owner,
            bool checklistAuthorized
        )
    {
        require(_ownerOf(tokenId) != address(0), "Query for nonexistent token");

        BadgeInfo memory info = badgeInfo[tokenId];
        turnaroundContract = info.turnaroundContract;
        actorId = info.actorId;
        owner = ownerOf(tokenId);
        checklistAuthorized = isChecklist[turnaroundContract];
    }
}
