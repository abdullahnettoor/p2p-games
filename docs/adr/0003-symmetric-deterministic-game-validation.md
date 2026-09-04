# Symmetric Deterministic Game Validation

In pure P2P 1-on-1 matches without an authoritative server, both clients run the identical deterministic `GameDefinition` state machine. Each player submits serializable `Move` objects across the `Transport`. Win claims and state transitions are verified independently and deterministically on both clients upon receipt.
