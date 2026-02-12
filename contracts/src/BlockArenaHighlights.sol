// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title BlockArenaHighlights — On-chain NFT for arena top performers
/// @notice Minted by ArenaEngine when a player finishes #1 in an arena
contract BlockArenaHighlights is ERC721 {
    using Strings for uint256;
    using Strings for uint16;
    using Strings for uint40;

    // ─── Packed Highlight Data (1 slot) ───────────────────────────────
    struct Highlight {
        uint40  arenaId;      // 5 bytes
        uint40  startBlock;   // 5 bytes
        uint40  endBlock;     // 5 bytes
        uint16  score;        // 2 bytes
        uint16  streak;       // 2 bytes
        address player;       // 20 bytes  — total: 39 bytes (fits in 2 slots, but tightly packed)
    }

    uint256 public nextTokenId;
    address public engine;
    address public owner;

    /// @dev tokenId → highlight data
    mapping(uint256 => Highlight) public highlights;

    error NotEngine();
    error NotOwner();

    modifier onlyEngine() {
        if (msg.sender != engine) revert NotEngine();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _engine) ERC721("BlockArena Highlights", "BAH") {
        engine = _engine;
        owner = msg.sender;
    }

    /// @notice Set engine address (owner only, for upgrades)
    function setEngine(address _engine) external onlyOwner {
        engine = _engine;
    }

    /// @notice Mint a highlight NFT — called by ArenaEngine on arena finalization
    function mintHighlight(
        address player,
        uint40 arenaId,
        uint40 startBlock,
        uint40 endBlock,
        uint16 score,
        uint16 streak
    ) external onlyEngine returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        highlights[tokenId] = Highlight({
            arenaId: arenaId,
            startBlock: startBlock,
            endBlock: endBlock,
            score: score,
            streak: streak,
            player: player
        });
        _mint(player, tokenId);
    }

    /// @notice On-chain SVG + JSON metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Highlight memory h = highlights[tokenId];

        // Build SVG
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:#0a0a2e">',
            '<text x="200" y="50" text-anchor="middle" fill="#ffd700" font-size="24" font-family="monospace">BLOCKARENA</text>',
            '<text x="200" y="90" text-anchor="middle" fill="#fff" font-size="16" font-family="monospace">HIGHLIGHT #', tokenId.toString(), '</text>',
            '<rect x="40" y="120" width="320" height="220" rx="10" fill="#1a1a4e" stroke="#ffd700" stroke-width="2"/>',
            '<text x="60" y="160" fill="#aaa" font-size="14" font-family="monospace">Arena: #', uint256(h.arenaId).toString(), '</text>',
            '<text x="60" y="190" fill="#aaa" font-size="14" font-family="monospace">Score: ', uint256(h.score).toString(), '</text>',
            '<text x="60" y="220" fill="#aaa" font-size="14" font-family="monospace">Streak: ', uint256(h.streak).toString(), '</text>',
            '<text x="60" y="250" fill="#aaa" font-size="14" font-family="monospace">Blocks: ', uint256(h.startBlock).toString(), '-', uint256(h.endBlock).toString(), '</text>',
            '<text x="200" y="370" text-anchor="middle" fill="#ffd700" font-size="20" font-family="monospace">GOD MODE</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"BlockArena Highlight #', tokenId.toString(),
            '","description":"Top player highlight from BlockArena","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Arena","value":', uint256(h.arenaId).toString(),
            '},{"trait_type":"Score","value":', uint256(h.score).toString(),
            '},{"trait_type":"Streak","value":', uint256(h.streak).toString(),
            '},{"trait_type":"Start Block","value":', uint256(h.startBlock).toString(),
            '},{"trait_type":"End Block","value":', uint256(h.endBlock).toString(),
            '}]}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
