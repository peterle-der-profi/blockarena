import {
  BlockArena,
} from "generated";
import type {
  Arena_t,
  Player_t,
  ArenaEntry_t,
  ReferralPayment_t,
  Tournament_t,
  TournamentArena_t,
  TournamentQualification_t,
  EmergencyEvent_t,
  TreasuryWithdrawal_t,
  ProtocolStats_t,
} from "generated/src/db/Entities.gen";

// ─── Helpers ───

function getOrDefaultPlayer(existing: Player_t | undefined, id: string): Player_t {
  return existing ?? {
    id,
    totalArenas: 0,
    totalWins: 0,
    totalEarnings: 0n,
    godStreak: 0,
    referrer_id: undefined,
    referralEarnings: 0n,
    isFlagged: false,
  };
}

function getOrDefaultStats(existing: ProtocolStats_t | undefined): ProtocolStats_t {
  return existing ?? {
    id: "singleton",
    totalArenas: 0,
    totalPlayers: 0,
    totalVolume: 0n,
    totalTournaments: 0,
    isPaused: false,
  };
}

// ─── Arena Events ───

BlockArena.ArenaCreated.handler(async ({ event, context }) => {
  const arena: Arena_t = {
    id: event.params.arenaId.toString(),
    tier: event.params.tier,
    entryFee: event.params.entryFee,
    startBlock: Number(event.params.startBlock),
    endBlock: Number(event.params.endBlock),
    epoch: 0,
    playerCount: 0,
    isFinalized: false,
    winnerCount: 0,
    bestScore: 0,
    totalPot: 0n,
    createdAt: event.block.number,
    finalizedAt: undefined,
    tournament_id: undefined,
  };
  context.Arena.set(arena);

  const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
  context.ProtocolStats.set({ ...stats, totalArenas: stats.totalArenas + 1 });
});

BlockArena.ArenaFinalized.handler(async ({ event, context }) => {
  const id = event.params.arenaId.toString();
  const arena = await context.Arena.get(id);
  if (arena) {
    context.Arena.set({
      ...arena,
      isFinalized: true,
      winnerCount: Number(event.params.winnerCount),
      bestScore: event.params.bestScore,
      finalizedAt: event.block.number,
    });
  }
});

BlockArena.ArenaReset.handler(async ({ event, context }) => {
  const id = event.params.arenaId.toString();
  const arena = await context.Arena.get(id);
  if (arena) {
    context.Arena.set({
      ...arena,
      epoch: event.params.newEpoch,
      isFinalized: false,
      playerCount: 0,
      winnerCount: 0,
      bestScore: 0,
      totalPot: 0n,
    });
  }
});

// ─── Player Events ───

BlockArena.PlayerJoined.handler(async ({ event, context }) => {
  const arenaId = event.params.arenaId.toString();
  const playerAddr = event.params.player.toLowerCase();
  const refAddr = event.params.ref.toLowerCase();

  // Update player
  const player = getOrDefaultPlayer(await context.Player.get(playerAddr), playerAddr);
  const isNew = player.totalArenas === 0;
  const updatedPlayer = { ...player, totalArenas: player.totalArenas + 1 };

  // Set referrer if non-zero
  if (refAddr !== "0x0000000000000000000000000000000000000000" && !player.referrer_id) {
    const ref = getOrDefaultPlayer(await context.Player.get(refAddr), refAddr);
    context.Player.set({ ...ref }); // ensure referrer exists
    context.Player.set({ ...updatedPlayer, referrer_id: refAddr });
  } else {
    context.Player.set(updatedPlayer);
  }

  // Create arena entry
  const entryId = `${arenaId}-${playerAddr}`;
  const entry: ArenaEntry_t = {
    id: entryId,
    arena_id: arenaId,
    player_id: playerAddr,
    committed: false,
    revealed: false,
    wonAmount: 0n,
  };
  context.ArenaEntry.set(entry);

  // Update arena player count
  const arena = await context.Arena.get(arenaId);
  if (arena) {
    context.Arena.set({
      ...arena,
      playerCount: arena.playerCount + 1,
      totalPot: arena.totalPot + arena.entryFee,
    });
  }

  // Update protocol stats
  if (isNew) {
    const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
    context.ProtocolStats.set({ ...stats, totalPlayers: stats.totalPlayers + 1 });
  }
});

BlockArena.PredictionCommitted.handler(async ({ event, context }) => {
  const entryId = `${event.params.arenaId.toString()}-${event.params.player.toLowerCase()}`;
  const entry = await context.ArenaEntry.get(entryId);
  if (entry) {
    context.ArenaEntry.set({ ...entry, committed: true });
  }
});

BlockArena.PredictionRevealed.handler(async ({ event, context }) => {
  const entryId = `${event.params.arenaId.toString()}-${event.params.player.toLowerCase()}`;
  const entry = await context.ArenaEntry.get(entryId);
  if (entry) {
    context.ArenaEntry.set({ ...entry, revealed: true });
  }
});

BlockArena.PotDistributed.handler(async ({ event, context }) => {
  const arenaId = event.params.arenaId.toString();
  const playerAddr = event.params.winner.toLowerCase();
  const amount = event.params.amount;

  // Update entry
  const entryId = `${arenaId}-${playerAddr}`;
  const entry = await context.ArenaEntry.get(entryId);
  if (entry) {
    context.ArenaEntry.set({ ...entry, wonAmount: entry.wonAmount + amount });
  }

  // Update player
  const player = getOrDefaultPlayer(await context.Player.get(playerAddr), playerAddr);
  context.Player.set({
    ...player,
    totalWins: player.totalWins + 1,
    totalEarnings: player.totalEarnings + amount,
  });

  // Update protocol volume
  const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
  context.ProtocolStats.set({ ...stats, totalVolume: stats.totalVolume + amount });
});

// ─── Referral Events ───

BlockArena.ReferralPaid.handler(async ({ event, context }) => {
  const refAddr = event.params.ref.toLowerCase();
  const playerAddr = event.params.player.toLowerCase();

  const payment: ReferralPayment_t = {
    id: `${event.block.number}-${event.logIndex}`,
    referrer_id: refAddr,
    player_id: playerAddr,
    amount: event.params.amount,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  };
  context.ReferralPayment.set(payment);

  // Update referrer earnings
  const ref = getOrDefaultPlayer(await context.Player.get(refAddr), refAddr);
  context.Player.set({ ...ref, referralEarnings: ref.referralEarnings + event.params.amount });
});

BlockArena.ReferrerSet.handler(async ({ event, context }) => {
  const playerAddr = event.params.player.toLowerCase();
  const refAddr = event.params.ref.toLowerCase();

  const player = getOrDefaultPlayer(await context.Player.get(playerAddr), playerAddr);
  const ref = getOrDefaultPlayer(await context.Player.get(refAddr), refAddr);
  context.Player.set({ ...ref }); // ensure exists
  context.Player.set({ ...player, referrer_id: refAddr });
});

// ─── Streak Events ───

BlockArena.GodStreakUpdate.handler(async ({ event, context }) => {
  const playerAddr = event.params.player.toLowerCase();
  const player = getOrDefaultPlayer(await context.Player.get(playerAddr), playerAddr);
  context.Player.set({ ...player, godStreak: event.params.streak });
});

BlockArena.BotDetected.handler(async ({ event, context }) => {
  const playerAddr = event.params.player.toLowerCase();
  const player = getOrDefaultPlayer(await context.Player.get(playerAddr), playerAddr);
  context.Player.set({ ...player, isFlagged: true });
});

// ─── Tournament Events ───

BlockArena.TournamentCreated.handler(async ({ event, context }) => {
  const id = event.params.tournamentId.toString();
  const tournament: Tournament_t = {
    id,
    tier: event.params.tier,
    roundCount: event.params.roundCount,
    arenasPerRound: event.params.arenasPerRound,
    isFinalized: false,
  };
  context.Tournament.set(tournament);

  const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
  context.ProtocolStats.set({ ...stats, totalTournaments: stats.totalTournaments + 1 });
});

BlockArena.TournamentFinalized.handler(async ({ event, context }) => {
  const id = event.params.tournamentId.toString();
  const tournament = await context.Tournament.get(id);
  if (tournament) {
    context.Tournament.set({ ...tournament, isFinalized: true });
  }
});

BlockArena.TournamentArenaAdded.handler(async ({ event, context }) => {
  const tournamentId = event.params.tournamentId.toString();
  const arenaId = event.params.arenaId.toString();
  const round = event.params.round;

  const ta: TournamentArena_t = {
    id: `${tournamentId}-${round}-${arenaId}`,
    tournament_id: tournamentId,
    round,
    arena_id: arenaId,
  };
  context.TournamentArena.set(ta);

  // Link arena to tournament
  const arena = await context.Arena.get(arenaId);
  if (arena) {
    context.Arena.set({ ...arena, tournament_id: tournamentId });
  }
});

BlockArena.TournamentPlayerQualified.handler(async ({ event, context }) => {
  const tournamentId = event.params.tournamentId.toString();
  const playerAddr = event.params.player.toLowerCase();
  const round = event.params.round;

  const tq: TournamentQualification_t = {
    id: `${tournamentId}-${round}-${playerAddr}`,
    tournament_id: tournamentId,
    round,
    player_id: playerAddr,
  };
  context.TournamentQualification.set(tq);
});

// ─── Emergency & Admin Events ───

BlockArena.EmergencyWithdraw.handler(async ({ event, context }) => {
  const ee: EmergencyEvent_t = {
    id: `${event.block.number}-${event.logIndex}`,
    arenaId: event.params.arenaId,
    player_id: event.params.player.toLowerCase(),
    amount: event.params.amount,
    eventType: "withdraw",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  };
  context.EmergencyEvent.set(ee);
});

BlockArena.Paused.handler(async ({ event, context }) => {
  const ee: EmergencyEvent_t = {
    id: `${event.block.number}-${event.logIndex}`,
    arenaId: undefined,
    player_id: undefined,
    amount: undefined,
    eventType: "paused",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  };
  context.EmergencyEvent.set(ee);

  const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
  context.ProtocolStats.set({ ...stats, isPaused: true });
});

BlockArena.Unpaused.handler(async ({ event, context }) => {
  const ee: EmergencyEvent_t = {
    id: `${event.block.number}-${event.logIndex}`,
    arenaId: undefined,
    player_id: undefined,
    amount: undefined,
    eventType: "unpaused",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  };
  context.EmergencyEvent.set(ee);

  const stats = getOrDefaultStats(await context.ProtocolStats.get("singleton"));
  context.ProtocolStats.set({ ...stats, isPaused: false });
});

BlockArena.TreasuryWithdrawn.handler(async ({ event, context }) => {
  const tw: TreasuryWithdrawal_t = {
    id: `${event.block.number}-${event.logIndex}`,
    to: event.params.to.toLowerCase(),
    amount: event.params.amount,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
  };
  context.TreasuryWithdrawal.set(tw);
});
