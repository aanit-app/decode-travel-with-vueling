# TurnaroundChecklist Smart Contracts

Smart contracts for managing a **single aircraft turnaround** (from arrival to departure) as an on-chain checklist with:

- Time-bound operational tasks
- Role-based access control
- SLA & KPI computation
- Cryptographic certification
- Optional ERC-721 badges for actors with perfect performance

The system revolves around the `TurnaroundChecklist` contract and the `TurnaroundBadge` NFT contract, plus shared types and templates.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [Contracts & Files](#contracts--files)
  - [Data Model](#data-model)
  - [Roles](#roles)
- [Turnaround Lifecycle](#turnaround-lifecycle)
  - [1. Deployment](#1-deployment)
  - [2. Task Initialization](#2-task-initialization)
  - [3. Task Execution](#3-task-execution)
  - [4. Certification & Badges](#4-certification--badges)
- [TurnaroundChecklist Contract](#turnaroundchecklist-contract)
  - [Public API](#public-api)
    - [View Functions](#view-functions)
    - [Task Management](#task-management)
    - [Configuration](#configuration)
    - [Certification](#certification)
- [TurnaroundBadge Contract](#turnaroundbadge-contract)
  - [Overview](#overview-1)
  - [Access Control & Configuration](#access-control--configuration)
  - [Minting Rules](#minting-rules)
  - [Metadata & tokenuri](#metadata--tokenuri)
  - [Helper & Read Functions](#helper--read-functions)
- [Events](#events)
- [Badge Integration (End-to-End)](#badge-integration-end-to-end)
- [Security Considerations](#security-considerations)
- [Development & Deployment](#development--deployment)
- [License](#license)

---

## Overview

`TurnaroundChecklist` represents **one aircraft turnaround** in a specific airport and time window.  
It tracks a fixed set of **27 operational tasks** assigned to different operational actors:

- GroundHandling
- Cleaning
- Fuel
- Catering
- FlightCrew
- Gate

Each task has:

- A deadline relative to scheduled arrival
- A responsible actor
- A mandatory flag
- Status (`Pending`, `CompletedOnTime`, `CompletedLate`)
- Optional delay justification (for KPI/SLA adjustments)

After all mandatory tasks are completed, an OPS operator can **certify** the turnaround, computing:

- On-time / late task counts
- SLA breach flag
- Duration of the operational window
- A certificate hash summarizing the turnaround

The `TurnaroundBadge` contract is an ERC-721 NFT that mints **performance badges** to actor wallets that complete their tasks without unjustified delays.

---

## Architecture

### Contracts & Files

- `TurnaroundChecklist.sol`  
  Main contract implementing:

  - Turnaround storage
  - Task state and lifecycle
  - KPI computation
  - Certification and event emission
  - Role-based access
  - Optional badge minting

- `TurnaroundTemplates.sol`  
  Library (`TurnaroundTemplates`) that:

  - Defines `_addTask` (internal helper)
  - Defines `initStandardTasks` which initializes 27 standard tasks with deadlines computed from scheduled arrival

- `TurnaroundTypes.sol`  
  Shared types and events:

  - `enum Actor`
  - `enum TaskStatus`
  - `struct Task`
  - `struct Turnaround`
  - Events:
    - `TaskMandatoryUpdated`
    - `TaskDelayJustified`

- `TurnaroundBadge.sol`  
  ERC-721 NFT contract used to:

  - Represent badges for successful participation in a turnaround
  - Store per-token metadata linking back to the checkout contract and actor
  - Provide on-chain IPFS-backed metadata

- `ITurnaroundBadge` (interface inside `TurnaroundChecklist.sol`)  
  Minimal interface used by `TurnaroundChecklist` to mint badges:
  - `function mintBadge(address to, address turnaroundContract, uint8 actorId) external;`

### Data Model

Key types (from `TurnaroundTypes.sol`):

- `enum Actor`  
  Represents operational actors:

  - 0: GroundHandling
  - 1: Cleaning
  - 2: Fuel
  - 3: Catering
  - 4: FlightCrew
  - 5: Gate

- `enum TaskStatus`

  - `Pending`
  - `CompletedOnTime`
  - `CompletedLate`

- `struct Task`

  - `uint8 templateId` – 0..26 according to standard checklist
  - `Actor actor` – responsible actor
  - `uint256 deadline` – timestamp by which the task should be done
  - `uint256 completedAt` – timestamp when the task was marked as done
  - `TaskStatus status` – current status
  - `bool mandatory` – whether this task is mandatory for certification
  - `bool justifiedDelay` – if true, late completion does not count against SLA/KPIs
  - `string delayReason` – optional human-readable reason

- `struct Turnaround`

  - `uint256 id` – reserved, not actively used in logic
  - `string turnaroundId` – off-chain identifier
  - `string airport`
  - `uint256 scheduledArrival`
  - `uint256 scheduledDeparture`
  - `uint256 createdAt`
  - `bool certified`
  - `bool slaBreached`
  - `uint256 totalTasks`
  - `uint256 onTimeTasks`
  - `uint256 lateTasks`
  - `uint256 firstTaskCompletedAt`
  - `uint256 lastTaskCompletedAt`
  - `bytes32 certificateHash`

Storage in `TurnaroundChecklist`:

- `Turnaround public turnaround;`
- `Task[] private _tasks;`
- `mapping(Actor => address) public actorWallets;`
- `ITurnaroundBadge public badgeContract;`

Key types in `TurnaroundBadge`:

- `struct BadgeInfo`
  - `address turnaroundContract` – checklist contract for which the badge was awarded
  - `uint8 actorId` – 0..5, aligned with `Actor` enum

Storage in `TurnaroundBadge`:

- `uint256 public nextTokenId;` – incremental token counter
- `mapping(address => mapping(uint8 => bool)) public hasBadge;`  
  Records if a given `(turnaroundContract, actorId)` pair already has a badge.
- `mapping(address => bool) public isChecklist;`  
  Whitelisted checklist contracts allowed to mint (optionally enforced).
- `mapping(uint256 => BadgeInfo) public badgeInfo;`  
  Per-token metadata.
- `mapping(uint8 => string) public actorCID;`  
  IPFS CIDs for images, one per actor.

### Roles

Access control in `TurnaroundChecklist` is provided by OpenZeppelin’s `AccessControl`:

- `DEFAULT_ADMIN_ROLE`

  - Granted to `msg.sender` in the constructor.
  - Can:
    - Manage roles (standard AccessControl behaviour)
    - Update actor wallets (`updateActorWallet`)
    - Set the badge contract (`setBadgeContract`)

- `OPS_ROLE`

  - Granted to `opsAdmin` in the constructor.
  - Used for:
    - Finalizing the turnaround (`finalizeTurnaround`)
    - Setting tasks as mandatory (`setTaskMandatory`)
    - Acting as override in `onlyActorOrOps` (for marking tasks completed / justifying delays)

- Actor wallets (`mapping(Actor => address) public actorWallets`)
  - Each `Actor` has a dedicated wallet.
  - These wallets are allowed to:
    - Mark tasks complete (for tasks assigned to their actor)
    - Justify delays (for tasks assigned to their actor)

Access control in `TurnaroundBadge`:

- Inherits `Ownable`.
- `onlyOwner` can:
  - Configure allowed checklist contracts (`setChecklistContract`)
  - Update actor CIDs (`setActorCID`)

---

## Turnaround Lifecycle

### 1. Deployment

`TurnaroundChecklist` is **single-turnaround**: each deployment corresponds to one turnaround.

Constructor signature:

- `constructor(
  address opsAdmin,
  address groundHandling,
  address cleaning,
  address fuel,
  address catering,
  address flightCrew,
  address gate,
  string memory turnaroundId,
  string memory airport,
  uint256 scheduledArrival,
  uint256 scheduledDeparture
)`

Key behaviours:

- Validates that `scheduledDeparture > scheduledArrival`.
- Grants:
  - `DEFAULT_ADMIN_ROLE` to `msg.sender`
  - `OPS_ROLE` to `opsAdmin`
- Initializes `actorWallets` with the provided actor addresses.
- Sets turnaround metadata (`turnaroundId`, `airport`, `scheduledArrival`, `scheduledDeparture`, `createdAt`).
- Calls `TurnaroundTemplates.initStandardTasks` to create 27 tasks.
- Sets `turnaround.totalTasks`.
- Emits `TurnaroundCreated`.

### 2. Task Initialization

`TurnaroundTemplates.initStandardTasks(Task[] storage tasks, uint256 arr)`:

- Creates 27 tasks with `templateId` 0..26.
- Each task:
  - Has a pre-defined `Actor`
  - Has a deadline `arr + X minutes`, where `arr` is `scheduledArrival`
  - Has a default `mandatory` flag

Examples (simplified):

- `templateId 0` – GroundHandling – `Chocks On` – `arr + 1 minute` – mandatory
- `templateId 6` – Fuel – `Refueling Start` – `arr + 6 minutes` – mandatory
- `templateId 26` – GroundHandling – `Chocks Off` – `arr + 40 minutes` – mandatory

Front-ends or off-chain systems map `templateId` to human-readable labels.

### 3. Task Execution

Tasks are managed via:

- `markTaskCompleted(uint256 taskIndex)`
- `justifyDelayedTask(uint256 taskIndex, string calldata reason)`
- `setTaskMandatory(uint256 taskIndex, bool mandatory)`

Authorization (`onlyActorOrOps`):

- For a given `taskIndex`, `msg.sender` must be:
  - The configured `actorWallets[task.actor]`, or
  - An address with `OPS_ROLE`.

`markTaskCompleted`:

- Requires:
  - Turnaround not certified.
  - Task status is `Pending`.
- Sets `task.completedAt = block.timestamp`.
- If `block.timestamp <= task.deadline`:
  - `task.status = CompletedOnTime`
  - `turnaround.onTimeTasks++`
  - Clears `task.justifiedDelay` and `task.delayReason`.
- Else (late):
  - `task.status = CompletedLate`
  - If `task.justifiedDelay == false`:
    - `turnaround.lateTasks++`
    - `turnaround.slaBreached = true`
- Updates `turnaround.firstTaskCompletedAt` and `turnaround.lastTaskCompletedAt`.
- Emits `TaskCompleted`.

`justifyDelayedTask`:

- Requires:
  - Turnaround not certified.
  - Task status is `Pending` or `CompletedLate`.
  - `task.justifiedDelay == false`.
- If task was `CompletedLate`:
  - Decrements `turnaround.lateTasks` (if > 0).
  - If `lateTasks` becomes 0, sets `turnaround.slaBreached = false`.
- Sets `task.justifiedDelay = true` and `task.delayReason = reason`.
- Emits `TaskDelayJustified`.

`setTaskMandatory`:

- OPS-only.
- Updates `task.mandatory`.
- Emits `TaskMandatoryUpdated`.

### 4. Certification & Badges

`finalizeTurnaround()` (OPS-only):

1. Ensures the turnaround is not already certified.
2. Requires at least one task.
3. Iterates all tasks:
   - If `status == Pending`:
     - Reverts if `task.mandatory == true` (all mandatory tasks must be completed).
   - If completed:
     - Requires `status` is `CompletedOnTime` or `CompletedLate`.
     - Increments `actorTaskCount[actorId]`.
     - Increments `actorLateCount[actorId]` if the task is late and `!task.justifiedDelay`.
4. Sets `turnaround.certified = true`.
5. Computes `durationSeconds` from `firstTaskCompletedAt` and `lastTaskCompletedAt` (0 if not well defined).
6. Computes `turnaround.certificateHash = keccak256(abi.encode(...))` over:
   - `address(this)`
   - `turnaroundId`
   - `airport`
   - `scheduledArrival`
   - `scheduledDeparture`
   - `onTimeTasks`
   - `lateTasks`
   - `slaBreached`
   - `durationSeconds`
   - `block.timestamp`
7. Emits `TurnaroundCertified`.
8. If `badgeContract` is set:
   - For actors `0..5`:
     - If `actorTaskCount[a] > 0` and `actorLateCount[a] == 0`:
       - Looks up `actorWallets[Actor(a)]`.
       - If non-zero, calls `badgeContract.mintBadge(wallet, address(this), a)`.

---

## TurnaroundChecklist Contract

### Public API

#### View Functions

`getTasks() external view returns (Task[] memory);`

- Returns an in-memory copy of all tasks.
- Useful for off-chain dashboards and analytics.

`getTurnaroundKPIs() external view returns (
    uint256 totalTasks,
    uint256 onTimeTasks,
    uint256 lateTasks,
    bool slaBreached,
    uint256 durationSeconds
);`

- `totalTasks`: number of tasks in the turnaround.
- `onTimeTasks`: count of tasks completed on or before their deadline.
- `lateTasks`: count of unjustified late tasks.
- `slaBreached`: true if there is at least one unjustified late task.
- `durationSeconds`: `lastTaskCompletedAt - firstTaskCompletedAt`, or 0 if not defined.

#### Task Management

`markTaskCompleted(uint256 taskIndex) external onlyActorOrOps(taskIndex);`

- Marks a task as completed and updates KPIs.
- Can only be called by the responsible actor wallet or an OPS address.

`justifyDelayedTask(uint256 taskIndex, string calldata reason) external onlyActorOrOps(taskIndex);`

- Justifies a pending or late task, potentially reducing `lateTasks` and clearing `slaBreached`.
- Persists a human-readable `reason`.

#### Configuration

`updateActorWallet(Actor actor, address wallet) external onlyRole(DEFAULT_ADMIN_ROLE);`

- Updates the wallet for a specific actor.
- `wallet` must be non-zero.
- Emits `ActorWalletUpdated`.

`setTaskMandatory(uint256 taskIndex, bool mandatory) external onlyRole(OPS_ROLE);`

- Marks any task as mandatory or non-mandatory.
- Emits `TaskMandatoryUpdated`.

`setBadgeContract(address _badge) external onlyRole(DEFAULT_ADMIN_ROLE);`

- Sets the external `ITurnaroundBadge` contract.
- If `_badge` is the zero address, no badges will be minted on certification.

#### Certification

`finalizeTurnaround() external onlyRole(OPS_ROLE);`

- Validates mandatory tasks.
- Computes KPIs and certificate hash.
- Marks the turnaround as certified.
- Emits `TurnaroundCertified`.
- Optionally mints badges using the configured `badgeContract`.

---

## TurnaroundBadge Contract

### Overview

`TurnaroundBadge` is an ERC-721 contract that mints **non-transferable (by default behaviour they are transferable, but system-level policies can treat them as reputation)** badges representing successful participation in a turnaround.

Key features:

- One badge per `(turnaroundContract, actorId)` pair (enforced by `hasBadge`, can be fully enforced if commented `require`s are enabled).
- On-chain `tokenURI` that returns IPFS-based JSON metadata.
- Per-actor IPFS CIDs for image assets.
- Optional whitelist of checklist contracts allowed to mint badges.

The contract inherits:

- `ERC721("Turnaround Badge", "TAB")`
- `Ownable(initialOwner)`

### Access Control & Configuration

State:

- `mapping(address => bool) public isChecklist;`  
  Whitelisted checklist contracts.

Configuration functions (`onlyOwner`):

- `setChecklistContract(address _checklist, bool allowed)`

  - Enables or disables a checklist contract to mint badges.
  - Designed to be used in conjunction with the commented `require(isChecklist[msg.sender])` in `mintBadge`.

- `setActorCID(uint8 actorId, string calldata cid)`

  - Updates the IPFS CID of the image for a given actor.
  - Requires `actorId <= 5`.
  - Allows the operator to update art or fix CIDs post-deployment.

Constructor:

- `constructor(address initialOwner) ERC721("Turnaround Badge", "TAB") Ownable(initialOwner)`

  - Sets the initial owner of the contract.
  - Initializes `actorCID` for actor IDs 0..5 with predefined IPFS CIDs:
    - 0: GroundHandling
    - 1: Cleaning
    - 2: Fuel
    - 3: Catering
    - 4: FlightCrew
    - 5: Gate

### Minting Rules

State:

- `uint256 public nextTokenId;`  
  Incremental ID used for `tokenId`.
- `mapping(address => mapping(uint8 => bool)) public hasBadge;`  
  Tracks if a specific `(turnaroundContract, actorId)` already has a badge.

Minting function:

- `mintBadge(address to, address turnaroundContract, uint8 actorId) external;`

  Intended rules (commented in the contract and can be enabled for stricter enforcement):

  - `require(isChecklist[msg.sender], "Not authorized");`  
    Only whitelisted checklist contracts should be allowed to mint.
  - `require(turnaroundContract == msg.sender, "turnaroundContract mismatch");`  
    Ensures the `turnaroundContract` parameter matches `msg.sender`.
  - `require(!hasBadge[turnaroundContract][actorId], "Badge already minted");`  
    Prevents duplicate badges for the same `(turnaroundContract, actorId)` pair.

  Current implemented behaviour:

  - Computes `tokenId = nextTokenId++`.
  - Sets `hasBadge[turnaroundContract][actorId] = true`.
  - Stores a `BadgeInfo` struct for `tokenId`:
    - `turnaroundContract`
    - `actorId`
  - Calls `_safeMint(to, tokenId)` to mint the NFT.

The checklist contract (e.g. `TurnaroundChecklist`) is expected to call `mintBadge` for each actor that:

- Has at least one task in the turnaround.
- Has no unjustified late tasks.

### Metadata & tokenURI

`tokenURI(uint256 tokenId) public view override returns (string memory)`

- Requires that `_ownerOf(tokenId) != address(0)` (token must exist).
- Looks up `BadgeInfo` from `badgeInfo[tokenId]`.
- Derives:
  - `actorName` from `_actorName(info.actorId)`
  - `tokenIdStr` from `tokenId.toString()`
  - `turnaroundAddrStr` using `_addressToString(info.turnaroundContract)`
- Fetches `cid = actorCID[info.actorId]` and requires it is non-empty.
- Constructs `image = "ipfs://" + cid`.
- Builds a JSON string of the form:

  - `name`: `"Turnaround Badge #<tokenId>"`
  - `description`: `"Badge for <actorName> in a Vueling turnaround contract."`
  - `image`: `ipfs://<CID>`
  - `attributes`:
    - `{"trait_type":"airline","value":"Vueling"}`
    - `{"trait_type":"turnaroundContract","value":"0x..."}`
    - `{"trait_type":"actor","value":"<actorName>"}`

- Encodes the JSON using `Base64.encode`.
- Returns an on-chain data URI:

  - `"data:application/json;base64,<base64(json)>"`

This means no external metadata server is required; all metadata is fully on-chain, with images hosted on IPFS.

### Helper & Read Functions

Internal helpers:

- `_actorName(uint8 actorId) internal pure returns (string memory)`

  - Maps `actorId` to:
    - `GroundHandling`, `Cleaning`, `Fuel`, `Catering`, `FlightCrew`, `Gate`
  - Returns `"Unknown"` if `actorId` is outside 0..5.

- `_addressToString(address addr) internal pure returns (string memory)`

  - Uses `Strings.toHexString` to get an `0x`-prefixed hex string for the address.

External helper:

- `getBadgeDetails(uint256 tokenId) external view returns (
    address turnaroundContract,
    uint8 actorId,
    address owner,
    bool checklistAuthorized
)`

  - Requires the token to exist (`_ownerOf(tokenId) != address(0)`).
  - Returns:
    - `turnaroundContract` – from `badgeInfo[tokenId]`.
    - `actorId` – from `badgeInfo[tokenId]`.
    - `owner` – current token owner (`ownerOf(tokenId)`).
    - `checklistAuthorized` – `isChecklist[turnaroundContract]`.

This function is convenient for frontends to retrieve all relevant information about a badge in a single call.

---

## Events

From `TurnaroundChecklist` / `TurnaroundTypes`:

- `event TurnaroundCreated(
  string turnaroundId,
  string airport,
  uint256 scheduledArrival,
  uint256 scheduledDeparture,
  uint256 totalTasks
);`

- `event TaskCompleted(
  uint256 indexed taskIndex,
  uint8 templateId,
  Actor actor,
  TaskStatus status,
  uint256 completedAt,
  address actorWallet
);`

- `event TurnaroundCertified(
  bool onTime,
  uint256 onTimeTasks,
  uint256 lateTasks,
  uint256 durationSeconds,
  bytes32 certificateHash
);`

- `event ActorWalletUpdated(Actor actor, address wallet);`

- `event TaskMandatoryUpdated(
  uint256 indexed taskIndex,
  bool mandatory
);`

- `event TaskDelayJustified(
  uint256 indexed taskIndex,
  string reason
);`

These events provide a full audit trail of:

- Turnaround creation
- Task completions
- Task configuration changes
- Delay justifications
- Turnaround certification
- Actor wallet updates

`TurnaroundBadge` itself relies mostly on standard ERC721 events (such as `Transfer`).  
The `badgeInfo` and `hasBadge` mappings can be queried off-chain to reconstruct state.

---

## Badge Integration (End-to-End)

1. A `TurnaroundBadge` contract is deployed with an `initialOwner`.
2. The operator configures:
   - Actor CIDs (if different from the defaults) via `setActorCID`.
   - Checklist contracts allowed to mint via `setChecklistContract` (if the commented checks in `mintBadge` are used).
3. A `TurnaroundChecklist` contract is deployed for each turnaround, and later:
   - Calls `setBadgeContract(address(turnaroundBadge))` from an admin account.
4. After tasks are completed:
   - `finalizeTurnaround()` is called by an OPS account.
   - For each actor with tasks and no unjustified late tasks:
     - `badgeContract.mintBadge(actorWallet, address(this), actorId)` is invoked.
5. The resulting NFTs:
   - Can be queried via `tokenURI` to obtain on-chain metadata pointing to IPFS images.
   - Can be introspected using `getBadgeDetails` to know who, what, and which checklist they are associated with.

---

## Security Considerations

- **Role management (TurnaroundChecklist)**:

  - `DEFAULT_ADMIN_ROLE` and `OPS_ROLE` are powerful and must be protected.
  - A compromised OPS address could manipulate tasks or certify a turnaround incorrectly.

- **Actor wallets**:

  - Actor wallets directly control task status and justifications.
  - Operational processes and off-chain controls should ensure these keys are trusted.

- **Checklist authorization (TurnaroundBadge)**:

  - Currently the `require` checks in `mintBadge` are commented out.
  - For production deployments, consider:
    - Enabling `isChecklist[msg.sender]` enforcement.
    - Enforcing `turnaroundContract == msg.sender`.
    - Enforcing uniqueness via `hasBadge`.
  - Without these guards, any address can call `mintBadge` and create arbitrary badges.

- **On-chain time**:

  - All SLAs and deadlines depend on `block.timestamp`.
  - Minor timestamp manipulation is possible at the miner level, but typically small relative to operational windows.

- **Re-entrancy**:

  - `TurnaroundChecklist` only calls `badgeContract.mintBadge` after all state changes and after marking `certified = true`.
  - This reduces the surface for re-entrancy attacks, but the badge contract should still be trusted / audited.

- **Token existence checks**:

  - `TurnaroundBadge.tokenURI` and `getBadgeDetails` use `_ownerOf(tokenId)` to ensure the token exists before proceeding.

- **Single-turnaround pattern**:
  - Each `TurnaroundChecklist` instance represents exactly one turnaround.
  - To scale, consider a factory or registry contract that:
    - Deploys new `TurnaroundChecklist` instances.
    - Manages authorized checklists for `TurnaroundBadge`.

---

## Development & Deployment

### Requirements

- Solidity compiler version: `0.8.30`
- OpenZeppelin Contracts:
  - `@openzeppelin/contracts/access/AccessControl.sol`
  - `@openzeppelin/contracts/access/Ownable.sol`
  - `@openzeppelin/contracts/token/ERC721/ERC721.sol`
  - `@openzeppelin/contracts/utils/Strings.sol`
  - `@openzeppelin/contracts/utils/Base64.sol`

### Typical Steps

1. Install dependencies (Hardhat example):

   - `npm install @openzeppelin/contracts`

2. Compile:

   - `npx hardhat compile`

3. Deploy `TurnaroundBadge`:

   - Provide an `initialOwner` address.
   - Optionally update `actorCID` entries and authorize checklist contracts.

4. Deploy `TurnaroundChecklist` per turnaround:

   - Provide:
     - `opsAdmin`
     - Actor wallets:
       - `groundHandling`
       - `cleaning`
       - `fuel`
       - `catering`
       - `flightCrew`
       - `gate`
     - `turnaroundId`
     - `airport`
     - `scheduledArrival`
     - `scheduledDeparture`
   - From an admin, call `setBadgeContract` with the deployed `TurnaroundBadge` address.

5. Operational flow:

   - Actor wallets / OPS:
     - Call `markTaskCompleted`.
     - Call `justifyDelayedTask` when required.
   - OPS:
     - Adjust `setTaskMandatory` if needed.
     - Call `finalizeTurnaround` when the turnaround is complete and data is verified.

6. Front-end integration:

   - Fetch tasks using `getTasks`.
   - Show KPIs via `getTurnaroundKPIs`.
   - Show badges for actor wallets by:
     - Listening to `Transfer` events in `TurnaroundBadge`.
     - Querying `getBadgeDetails` and `tokenURI`.

---

## License

This project is licensed under the **MIT License**.

SPDX-License-Identifier: MIT
