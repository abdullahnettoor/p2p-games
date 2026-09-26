"use client";

import React, { useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { TicTacToeMatchCoordinator } from "../state/TicTacToeMatchCoordinator";
import { useTicTacToeMatch } from "../hooks/useTicTacToeMatch";
import { NotebookSurface } from "./NotebookSurface";
import { TicTacToeBoardGrid } from "./TicTacToeBoardGrid";
import { TicTacToePageTurn } from "./TicTacToePageTurn";
import { TicTacToeMarginTally } from "./TicTacToeMarginTally";
import { TicTacToeTurnTimer } from "./TicTacToeTurnTimer";
import { TicTacToeReactionBar } from "./TicTacToeReactionBar";
import { TicTacToeReactionOverlay } from "./TicTacToeReactionOverlay";
import { TicTacToeBetweenRoundsOverlay } from "./TicTacToeBetweenRoundsOverlay";
import { TicTacToeResultScreen } from "./TicTacToeResultScreen";
import { cn } from "@/lib/utils";
import styles from "./TicTacToeMatchplay.module.css";
import "../ticTacToeTokens.css";

export interface TicTacToeMatchplayProps {
  coordinator: TicTacToeMatchCoordinator;
  onExit: () => void;
  className?: string;
}

export const TicTacToeMatchplay: React.FC<TicTacToeMatchplayProps> = ({
  coordinator,
  onExit,
  className,
}) => {
  const {
    state,
    isMyTurn,
    submitMove,
    readyForNextRound,
    forfeit,
    sendReaction,
    requestRematch,
    acceptRematch,
    declineRematch,
  } = useTicTacToeMatch(coordinator);

  const [showForfeitModal, setShowForfeitModal] = useState(false);

  const {
    localPlayer,
    remotePlayer,
    seriesState,
    currentRoundState,
    roundRecords,
    turnSecondsRemaining,
    isBetweenRounds,
    betweenRoundsSecondsRemaining,
    localReadyNextRound,
    remoteReadyNextRound,
    isHostWaitingInGrace,
    isReconnecting,
    reconnectSecondsRemaining,
    rematchState,
    winResult,
  } = state;

  const isGameOver = winResult.isGameOver;
  const currentRoundNum = seriesState.currentRoundNumber;

  const hostId = localPlayer.role === "host" ? localPlayer.id : remotePlayer.id;
  const guestId =
    localPlayer.role === "guest" ? localPlayer.id : remotePlayer.id;
  const hostScore = seriesState.scores[hostId] ?? 0;
  const guestScore = seriesState.scores[guestId] ?? 0;

  const handleCellClick = (cellIndex: number) => {
    if (!isMyTurn || isBetweenRounds || isGameOver || isReconnecting) return;
    submitMove(cellIndex);
  };

  const handleConfirmForfeit = () => {
    setShowForfeitModal(false);
    forfeit();
  };

  const turnLabel = isMyTurn
    ? "Your turn"
    : `Waiting for ${remotePlayer.name}...`;

  return (
    <div
      className={cn(styles.matchplayContainer, className)}
      data-testid="ttt-matchplay-surface"
    >
      {/* Floating Reaction Overlay */}
      <TicTacToeReactionOverlay coordinator={coordinator} />

      {/* Disconnection Grace Banner */}
      {isReconnecting && (
        <div
          className={styles.reconnectBanner}
          role="alert"
          data-testid="ttt-reconnect-banner"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Opponent disconnected. Reconnecting... ({reconnectSecondsRemaining}s
            grace)
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className={styles.topBar}>
        <button
          type="button"
          onClick={() => setShowForfeitModal(true)}
          className={styles.iconButton}
          aria-label="Forfeit or leave match"
          data-testid="ttt-forfeit-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className={styles.turnIndicator}>
          <span className={styles.turnText} data-testid="ttt-turn-indicator">
            {turnLabel}
          </span>
          {!isBetweenRounds && !isGameOver && (
            <TicTacToeTurnTimer
              secondsRemaining={turnSecondsRemaining}
              isMyTurn={isMyTurn}
            />
          )}
        </div>
      </header>

      {/* Notebook Game Area */}
      <main className={styles.boardWrapper}>
        <NotebookSurface
          marginContent={
            <TicTacToeMarginTally
              hostScore={hostScore}
              guestScore={guestScore}
              bestOf={seriesState.bestOf}
            />
          }
        >
          {/* Keyed by Round so the page turns and the grid redraws each Round */}
          <TicTacToePageTurn roundKey={currentRoundNum}>
            <TicTacToeBoardGrid
              key={currentRoundNum}
              roundNumber={currentRoundNum}
              board={currentRoundState.board}
              winningLine={currentRoundState.winningLine}
              winnerInk={
                currentRoundState.winnerId === hostId ? "host" : "guest"
              }
              onCellClick={handleCellClick}
              disabled={
                !isMyTurn || isBetweenRounds || isGameOver || isReconnecting
              }
            />
          </TicTacToePageTurn>
        </NotebookSurface>
      </main>

      {/* Bottom Quick Reactions Toolbar */}
      <footer className={styles.bottomBar}>
        <TicTacToeReactionBar
          onSendReaction={sendReaction}
          disabled={isGameOver || isReconnecting}
        />
      </footer>

      {/* Between Rounds Modal Overlay */}
      {isBetweenRounds && !isGameOver && (
        <TicTacToeBetweenRoundsOverlay
          seriesState={seriesState}
          roundRecords={roundRecords}
          localPlayer={localPlayer}
          remotePlayer={remotePlayer}
          secondsRemaining={betweenRoundsSecondsRemaining}
          localReady={localReadyNextRound}
          remoteReady={remoteReadyNextRound}
          isHostWaitingInGrace={isHostWaitingInGrace}
          onNext={readyForNextRound}
        />
      )}

      {/* Match Result Screen Overlay */}
      {isGameOver && (
        <TicTacToeResultScreen
          winResult={winResult}
          seriesState={seriesState}
          roundRecords={roundRecords}
          localPlayer={localPlayer}
          remotePlayer={remotePlayer}
          rematchState={rematchState}
          onRequestRematch={requestRematch}
          onAcceptRematch={acceptRematch}
          onDeclineRematch={declineRematch}
          onExit={onExit}
        />
      )}

      {/* Forfeit Confirmation Modal */}
      {showForfeitModal && (
        <div
          className={styles.forfeitModal}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm forfeit"
          data-testid="ttt-forfeit-modal"
        >
          <div className={styles.forfeitCard}>
            <h3 className={styles.forfeitTitle}>Concede Match?</h3>
            <p className={styles.forfeitText}>
              Leaving now will forfeit the entire match to {remotePlayer.name}.
            </p>
            <div className={styles.forfeitActions}>
              <button
                type="button"
                className={styles.confirmForfeitBtn}
                onClick={handleConfirmForfeit}
                data-testid="ttt-confirm-forfeit"
              >
                Forfeit
              </button>
              <button
                type="button"
                className={styles.cancelForfeitBtn}
                onClick={() => setShowForfeitModal(false)}
                data-testid="ttt-cancel-forfeit"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
