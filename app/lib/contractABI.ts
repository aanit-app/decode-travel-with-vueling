export const contractABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "opsAdmin",
        type: "address",
      },
      {
        internalType: "address",
        name: "groundHandling",
        type: "address",
      },
      {
        internalType: "address",
        name: "cleaning",
        type: "address",
      },
      {
        internalType: "address",
        name: "fuel",
        type: "address",
      },
      {
        internalType: "address",
        name: "catering",
        type: "address",
      },
      {
        internalType: "address",
        name: "flightCrew",
        type: "address",
      },
      {
        internalType: "address",
        name: "gate",
        type: "address",
      },
      {
        internalType: "string",
        name: "turnaroundId",
        type: "string",
      },
      {
        internalType: "string",
        name: "airport",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "scheduledArrival",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "scheduledDeparture",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "neededRole",
        type: "bytes32",
      },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "enum Actor",
        name: "actor",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "address",
        name: "wallet",
        type: "address",
      },
    ],
    name: "ActorWalletUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "templateId",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "enum Actor",
        name: "actor",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "enum TaskStatus",
        name: "status",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "completedAt",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "actorWallet",
        type: "address",
      },
    ],
    name: "TaskCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "TaskDelayJustified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "mandatory",
        type: "bool",
      },
    ],
    name: "TaskMandatoryUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bool",
        name: "onTime",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "onTimeTasks",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "lateTasks",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "durationSeconds",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "certificateHash",
        type: "bytes32",
      },
    ],
    name: "TurnaroundCertified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "turnaroundId",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "airport",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "scheduledArrival",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "scheduledDeparture",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalTasks",
        type: "uint256",
      },
    ],
    name: "TurnaroundCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OPS_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Actor",
        name: "",
        type: "uint8",
      },
    ],
    name: "actorWallets",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "badgeContract",
    outputs: [
      {
        internalType: "contract ITurnaroundBadge",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "finalizeTurnaround",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTasks",
    outputs: [
      {
        components: [
          {
            internalType: "uint8",
            name: "templateId",
            type: "uint8",
          },
          {
            internalType: "enum Actor",
            name: "actor",
            type: "uint8",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "completedAt",
            type: "uint256",
          },
          {
            internalType: "enum TaskStatus",
            name: "status",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "mandatory",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "justifiedDelay",
            type: "bool",
          },
          {
            internalType: "string",
            name: "delayReason",
            type: "string",
          },
        ],
        internalType: "struct Task[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTurnaroundKPIs",
    outputs: [
      {
        internalType: "uint256",
        name: "totalTasks",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "onTimeTasks",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lateTasks",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "slaBreached",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "durationSeconds",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "justifyDelayedTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
    ],
    name: "markTaskCompleted",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_badge",
        type: "address",
      },
    ],
    name: "setBadgeContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "taskIndex",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "mandatory",
        type: "bool",
      },
    ],
    name: "setTaskMandatory",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "turnaround",
    outputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "turnaroundId",
        type: "string",
      },
      {
        internalType: "string",
        name: "airport",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "scheduledArrival",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "scheduledDeparture",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "certified",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "slaBreached",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "totalTasks",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "onTimeTasks",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lateTasks",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "firstTaskCompletedAt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastTaskCompletedAt",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "certificateHash",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum Actor",
        name: "actor",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "wallet",
        type: "address",
      },
    ],
    name: "updateActorWallet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
