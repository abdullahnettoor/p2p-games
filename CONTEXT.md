# P2P Web Games Platform

A zero-install, browser-based peer-to-peer multiplayer game platform hosting modular 1-on-1 turn-based and casual games.

## Language

**Game**:
A pluggable definition of rules, state transitions, board rendering, and win conditions (e.g., BINGO, Hangman).
_Avoid_: RuleSet, Minigame, App

**Match**:
A single live session of a Game played between two Players with an explicit lifecycle (waiting, active, completed).
_Avoid_: Room, Session, Lobby instance

**Player**:
A human participant in a Match, identified locally as Host or Guest.
_Avoid_: Peer, User, Client

**Host**:
The Player who initiates a Match and generates the shareable invite link.
_Avoid_: Server, Master, Admin, Room owner

**Guest**:
The Player who joins a Match via an invite link.
_Avoid_: Client, Joiner, Peer 2

**Move**:
A discrete, serializable action submitted by a Player and validated by the Game engine.
_Avoid_: Action, Turn event, Command, Packet

**Lobby**:
The pre-game coordination view where Players connect, ready up, and configure a Match before starting.
_Avoid_: Waiting room, Staging area

**Transport**:
The abstracted communication layer responsible for transmitting Moves and lifecycle signals between Players.
_Avoid_: Socket, WebRTC layer, Connection manager
