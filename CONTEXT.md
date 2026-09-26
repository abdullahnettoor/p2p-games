# P2P Web Games Platform

A zero-install, browser-based peer-to-peer multiplayer game platform hosting modular 1-on-1 turn-based and casual games.

## Language

**Game**:
A pluggable definition of rules, state transitions, board rendering, and win conditions (e.g., BINGO, Hangman).
_Avoid_: RuleSet, Minigame, App

**Catalog**:
The platform's home surface, presenting every available Game as a drawer of icons. It is the only place a Game is chosen, and it offers no Game-specific actions.
_Avoid_: Hub, Home, Menu, Landing, Storefront

**Game Shell**:
The full-screen surface a Game owns once it is opened from the Catalog. Platform identity and platform chrome stop at its edge; the Game supplies its own visual system and its own single exit.
_Avoid_: Hub, Wrapper, Container, Game page

**Match**:
A single live session of a Game played between two Players with an explicit lifecycle (waiting, active, completed). A Match holds one or more Rounds; it completes when its Series is decided or a Player forfeits. A rematch starts a new Match.
_Avoid_: Room, Session, Lobby instance

**Round**:
One board played to a win or a draw inside a Match.
_Avoid_: Game (reserved for the pluggable definition), Set, Hand

**Series**:
The fixed number of Rounds that decides a Match: best of 1, 3 or 5. A drawn Round still counts toward the length but scores for nobody. The Player with more Round wins takes the Match, it ends early once the result can't change, and a level score after the last Round is a drawn Match.
_Avoid_: Tournament, Set, Bout

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

**BINGO Board**:
A private 5x5 arrangement of the numbers 1 through 25 belonging to one Player in a BINGO Match.
_Avoid_: Card, Grid, Ticket

**Call**:
The number chosen by the active Player during a BINGO Move and applied to both BINGO Boards.
_Avoid_: Pick, Selected number, Draw

**Pass**:
The end of a BINGO turn without a Call, chosen voluntarily or caused by the turn timer expiring.
_Avoid_: Skip, Missed Move, Forfeit

**Lobby**:
The pre-game coordination view where Players connect, ready up, and configure a Match before starting.
_Avoid_: Waiting room, Staging area

**Transport**:
The abstracted communication layer responsible for transmitting Moves and lifecycle signals between Players.
_Avoid_: Socket, WebRTC layer, Connection manager
