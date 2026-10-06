"use client";

// TEMPORARY DEBUG MENU - only rendered in development (next dev)

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Bug, X } from "lucide-react";

type LogEntry = {
  id: number;
  direction: "in" | "out";
  event: string;
  args: unknown[];
  time: number;
};

type DebugSnapshot = {
  error?: string;
  id: string;
  gameState: string | null;
  players: { id: string; name: string; lives?: number; score?: number }[];
  activeQuestion: {
    questionId: number;
    text: string;
    answer: string;
    targetPlayer: string;
    askedAt: string;
    timerRunning: boolean;
  } | null;
  currentQuestionIndex?: number;
  roundOneTotal: number;
  nextRoundOneQuestion: { question: string; answer: string } | null;
  roundTwoState: Record<string, unknown> | null;
  roundTwoPoolSize: number;
};

const MAX_LOG = 300;
const NOISY_EVENTS = ["timer-update"];

let nextLogId = 0;

export default function DebugPanel({
  socket,
  lobbyId,
}: {
  socket: Socket | null;
  lobbyId: string;
}) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [hideNoisy, setHideNoisy] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const hideNoisyRef = useRef(hideNoisy);
  hideNoisyRef.current = hideNoisy;

  // Capture every incoming and outgoing socket event
  useEffect(() => {
    if (!socket) return;

    const push = (direction: LogEntry["direction"]) =>
      (event: string, ...args: unknown[]) => {
        if (pausedRef.current) return;
        // don't log the panel's own polling
        if (event === "debug-state-req") return;
        if (hideNoisyRef.current && NOISY_EVENTS.includes(event)) return;
        setLog((prev) =>
          [
            { id: nextLogId++, direction, event, args, time: Date.now() },
            ...prev,
          ].slice(0, MAX_LOG),
        );
      };

    const onIn = push("in");
    const onOut = push("out");
    socket.onAny(onIn);
    socket.onAnyOutgoing(onOut);

    return () => {
      socket.offAny(onIn);
      socket.offAnyOutgoing(onOut);
    };
  }, [socket]);

  // Poll the server-side lobby state while the panel is open
  useEffect(() => {
    if (!socket || !open) return;

    const poll = () =>
      socket.emit("debug-state-req", { lobbyId }, (data: DebugSnapshot) =>
        setSnapshot(data),
      );

    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [socket, open, lobbyId]);

  const sendAction = (action: string) => {
    socket?.emit("debug-action", { lobbyId, action });
  };

  const playerName = (id?: string | null) =>
    snapshot?.players.find((p) => p.id === id)?.name ?? id ?? "-";

  const visibleLog = log.filter(
    (entry) => !(hideNoisy && NOISY_EVENTS.includes(entry.event)),
  );

  if (!open) {
    return (
      <button
        data-sound="off"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[1000] flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg jetbrains"
      >
        <Bug size={14} /> DEBUG
      </button>
    );
  }

  return (
    <div
      data-sound="off"
      className="fixed bottom-4 right-4 z-[1000] flex max-h-[85vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-red-600 bg-[#111111]/95 text-xs text-white shadow-2xl jetbrains">
      <div className="flex items-center justify-between bg-red-600 px-3 py-2 font-bold">
        <span className="flex items-center gap-1">
          <Bug size={14} /> DEBUG · {lobbyId} · {socket?.id ?? "no socket"}
        </span>
        <button onClick={() => setOpen(false)}>
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        {/* CURRENT QUESTION */}
        <section>
          <h3 className="mb-1 font-bold text-red-400">ACTIVE QUESTION</h3>
          {snapshot?.error && <div>{snapshot.error}</div>}
          {snapshot?.activeQuestion ? (
            <div className="rounded bg-white/5 p-2">
              <div className="opacity-70">{snapshot.activeQuestion.text}</div>
              <div className="mt-1 text-base font-bold text-green-400">
                {snapshot.activeQuestion.answer}
              </div>
              <div className="mt-1 opacity-50">
                #{snapshot.activeQuestion.questionId} → {playerName(snapshot.activeQuestion.targetPlayer)}
                {" · "}timer {snapshot.activeQuestion.timerRunning ? "running" : "not started"}
              </div>
            </div>
          ) : (
            <div className="opacity-50">none</div>
          )}
          {snapshot?.nextRoundOneQuestion && (
            <div className="mt-1 opacity-50">
              next: {snapshot.nextRoundOneQuestion.question} →{" "}
              <span className="text-green-400">
                {snapshot.nextRoundOneQuestion.answer}
              </span>
            </div>
          )}
        </section>

        {/* LOBBY STATE */}
        <section>
          <h3 className="mb-1 font-bold text-red-400">STATE</h3>
          <div>
            gameState: <b>{snapshot?.gameState ?? "-"}</b>
            {snapshot?.gameState === "roundOne" && (
              <>
                {" · "}question {(snapshot.currentQuestionIndex ?? 0) + 1}/
                {snapshot.roundOneTotal}
              </>
            )}
            {snapshot?.gameState === "roundTwo" && (
              <> · pool {snapshot.roundTwoPoolSize}</>
            )}
          </div>
          {snapshot?.roundTwoState && (
            <pre className="mt-1 whitespace-pre-wrap rounded bg-white/5 p-2">
              {JSON.stringify(
                {
                  ...snapshot.roundTwoState,
                  currentChooser: playerName(
                    snapshot.roundTwoState.currentChooser as string,
                  ),
                  lastChooser: playerName(
                    snapshot.roundTwoState.lastChooser as string,
                  ),
                },
                null,
                2,
              )}
            </pre>
          )}
          <table className="mt-1 w-full">
            <tbody>
              {snapshot?.players.map((p, i) => (
                <tr
                  key={p.id}
                  className={p.id === socket?.id ? "text-yellow-300" : ""}
                >
                  <td>{i + 1}.</td>
                  <td>{p.name}</td>
                  <td>♥ {p.lives ?? "-"}</td>
                  <td>★ {p.score ?? "-"}</td>
                  <td className="opacity-40">{p.id.slice(0, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ACTIONS */}
        <section>
          <h3 className="mb-1 font-bold text-red-400">ACTIONS</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ["reset-lives", "Reset lives"],
              ["skip-to-round-two", "Skip to round 2"],
              ["end-game", "End game"],
            ].map(([action, label]) => (
              <button
                key={action}
                onClick={() => sendAction(action)}
                className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* BROADCAST LOG */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold text-red-400">
              EVENTS ({visibleLog.length})
            </h3>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={hideNoisy}
                  onChange={(e) => setHideNoisy(e.target.checked)}
                />
                hide timer
              </label>
              <button onClick={() => setPaused((p) => !p)}>
                {paused ? "▶ resume" : "⏸ pause"}
              </button>
              <button onClick={() => setLog([])}>clear</button>
            </div>
          </div>
          <div className="flex flex-col gap-[2px]">
            {visibleLog.map((entry) => (
              <div
                key={entry.id}
                className="cursor-pointer rounded bg-white/5 px-2 py-1 hover:bg-white/10"
                onClick={() =>
                  setExpanded((e) => (e === entry.id ? null : entry.id))
                }
              >
                <div className="flex gap-2">
                  <span className="opacity-40">
                    {new Date(entry.time).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      entry.direction === "in"
                        ? "text-sky-400"
                        : "text-orange-400"
                    }
                  >
                    {entry.direction === "in" ? "←" : "→"} {entry.event}
                  </span>
                  {expanded !== entry.id && (
                    <span className="truncate opacity-50">
                      {JSON.stringify(entry.args[0] ?? "")}
                    </span>
                  )}
                </div>
                {expanded === entry.id && (
                  <pre className="mt-1 whitespace-pre-wrap break-all opacity-80">
                    {JSON.stringify(
                      entry.args.length === 1 ? entry.args[0] : entry.args,
                      null,
                      2,
                    )}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
