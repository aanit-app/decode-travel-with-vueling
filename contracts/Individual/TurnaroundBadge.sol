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

    // turnaroundContract => actorId (0..5) => ya tiene badge?
    mapping(address => mapping(uint8 => bool)) public hasBadge;

    // Checklist / turnaround contracts permitidos para mintear
    mapping(address => bool) public isChecklist;

    // Info específica del badge
    struct BadgeInfo {
        address turnaroundContract; // dirección del contrato de turnaround
        uint8 actorId; // 0..5, mapea con Actor del checklist
    }

    // tokenId => info
    mapping(uint256 => BadgeInfo) public badgeInfo;

    constructor(
        address initialOwner
    ) ERC721("Turnaround Badge", "TAB") Ownable(initialOwner) {}

    // ---------------- CONFIG ----------------

    /// @notice Habilita o deshabilita un contrato de checklist para poder mintear badges
    function setChecklistContract(
        address _checklist,
        bool allowed
    ) external onlyOwner {
        isChecklist[_checklist] = allowed;
    }

    // ---------------- MINT ----------------

    /// @notice Sólo contratos de checklist autorizados pueden mintear badges
    /// @dev turnaroundContract debe ser el propio msg.sender (el contrato de checklist)
    function mintBadge(
        address to,
        address turnaroundContract,
        uint8 actorId
    ) external {
        require(isChecklist[msg.sender], "Not authorized");
        require(
            turnaroundContract == msg.sender,
            "turnaroundContract mismatch"
        );
        require(!hasBadge[turnaroundContract][actorId], "Badge already minted");

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

    /// @dev SVG hardcodeado por actor, con tema Vueling-ish
    function _actorSVG(uint8 actorId) internal pure returns (string memory) {
        if (actorId == 0) {
            // GroundHandling
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-gh' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#0B1020'/>",
                        "<stop offset='100%' stop-color='#111827'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-gh)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Ground Handling Badge",
                        "</text>",
                        "<rect x='80' y='220' width='240' height='60' rx='12' fill='#FFD100'/>",
                        "<rect x='115' y='200' width='90' height='40' rx='8' fill='#FFFFFF22'/>",
                        "<circle cx='135' cy='305' r='18' fill='#020617'/>",
                        "<circle cx='265' cy='305' r='18' fill='#020617'/>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  GroundHandling",
                        "</text>",
                        "</svg>"
                    )
                );
        } else if (actorId == 1) {
            // Cleaning
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-cl' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#020617'/>",
                        "<stop offset='100%' stop-color='#0F172A'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-cl)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Cleaning Badge",
                        "</text>",
                        "<rect x='160' y='170' width='80' height='120' rx='18' fill='#7DD3FC'/>",
                        "<rect x='175' y='150' width='50' height='26' rx='6' fill='#FFFFFF44'/>",
                        "<circle cx='260' cy='170' r='8' fill='#FFFFFF55'/>",
                        "<circle cx='270' cy='188' r='6' fill='#FFFFFF33'/>",
                        "<circle cx='248' cy='193' r='5' fill='#FFFFFF22'/>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  Cleaning",
                        "</text>",
                        "</svg>"
                    )
                );
        } else if (actorId == 2) {
            // Fuel
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-fuel' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#020617'/>",
                        "<stop offset='100%' stop-color='#111827'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-fuel)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Fuel Badge",
                        "</text>",
                        "<path d='M200 140 C180 185 160 220 160 250 C160 285 180 310 200 310 C220 310 240 285 240 250 C240 220 220 185 200 140Z' fill='#F97316'/>",
                        "<circle cx='280' cy='190' r='36' fill='#00000055'/>",
                        "<path d='M280 160 A30 30 0 1 1 279.9 160' stroke='#FFFFFFAA' stroke-width='4' fill='none'/>",
                        "<line x1='280' y1='190' x2='295' y2='170' stroke='#F97316' stroke-width='4' stroke-linecap='round'/>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  Fuel",
                        "</text>",
                        "</svg>"
                    )
                );
        } else if (actorId == 3) {
            // Catering
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-cat' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#020617'/>",
                        "<stop offset='100%' stop-color='#0B1020'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-cat)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Catering Badge",
                        "</text>",
                        "<rect x='110' y='235' width='180' height='60' rx='10' fill='#A3E635'/>",
                        "<path d='M120 235 Q200 185 290 235 Z' fill='#FFFFFF33'/>",
                        "<circle cx='200' cy='205' r='8' fill='#FFFFFFAA'/>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  Catering",
                        "</text>",
                        "</svg>"
                    )
                );
        } else if (actorId == 4) {
            // FlightCrew
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-fc' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#020617'/>",
                        "<stop offset='100%' stop-color='#020617'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-fc)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Flight Crew Badge",
                        "</text>",
                        "<circle cx='200' cy='210' r='32' fill='#FACC15'/>",
                        "<path d='M60 220 L150 195 L150 225 L60 250 Z' fill='#FFFFFF33'/>",
                        "<path d='M340 220 L250 195 L250 225 L340 250 Z' fill='#FFFFFF33'/>",
                        "<text x='200' y='215' text-anchor='middle' fill='#0B1020' font-size='14' font-weight='bold' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG",
                        "</text>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  FlightCrew",
                        "</text>",
                        "</svg>"
                    )
                );
        } else if (actorId == 5) {
            // Gate
            return
                string(
                    abi.encodePacked(
                        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                        "<defs>",
                        "<linearGradient id='bg-gate' x1='0%' y1='0%' x2='100%' y2='100%'>",
                        "<stop offset='0%' stop-color='#020617'/>",
                        "<stop offset='100%' stop-color='#020617'/>",
                        "</linearGradient>",
                        "</defs>",
                        "<rect width='100%' height='100%' fill='url(#bg-gate)'/>",
                        "<rect x='24' y='24' width='352' height='352' rx='28' fill='#00000033' stroke='#FFFFFF22' stroke-width='2'/>",
                        "<text x='50%' y='70' text-anchor='middle' fill='#F9FAFB' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Vueling Turnaround",
                        "</text>",
                        "<text x='50%' y='95' text-anchor='middle' fill='#9CA3AF' font-size='14' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "Gate Badge",
                        "</text>",
                        "<rect x='90' y='190' width='90' height='110' rx='10' fill='#0B1020'/>",
                        "<rect x='105' y='205' width='60' height='50' rx='8' fill='#22C55E'/>",
                        "<rect x='200' y='220' width='120' height='40' rx='10' fill='#FFFFFF22'/>",
                        "<rect x='240' y='190' width='40' height='20' rx='6' fill='#FFFFFF55'/>",
                        "<text x='50%' y='340' text-anchor='middle' fill='#6B7280' font-size='12' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                        "VLG Ops  Gate",
                        "</text>",
                        "</svg>"
                    )
                );
        }

        // Fallback SVG (Unknown actor)
        return
            string(
                abi.encodePacked(
                    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>",
                    "<rect width='100%' height='100%' fill='#000000'/>",
                    "<text x='50%' y='50%' text-anchor='middle' fill='#FFFFFF' font-size='20' font-family='system-ui, -apple-system, BlinkMacSystemFont'>",
                    "Unknown Actor",
                    "</text>",
                    "</svg>"
                )
            );
    }

    // ---------------- METADATA VIEW ----------------

    /// @notice tokenURI on-chain: devuelve JSON + imagen SVG embebida (data: URI)
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

        // Hardcoded SVG per actor -> base64
        string memory svg = _actorSVG(info.actorId);
        string memory image = string(
            abi.encodePacked(
                "data:image/svg+xml;base64,",
                Base64.encode(bytes(svg))
            )
        );

        // JSON de metadata
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Turnaround Badge #',
                tokenIdStr,
                '",',
                '"description":"On-chain badge for ',
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
