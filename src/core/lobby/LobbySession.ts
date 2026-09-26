import { LobbyCoordinator, type LobbyCoordinatorOptions } from './LobbyCoordinator'

export { LobbyCoordinator, type LobbyCoordinatorOptions }
export const LobbySession = LobbyCoordinator
export type LobbySession<T = unknown> = LobbyCoordinator<T>
export type LobbySessionOptions<T = unknown> = LobbyCoordinatorOptions<T>
