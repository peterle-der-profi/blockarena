'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { keccak256, encodePacked, encodeAbiParameters, parseAbiParameters, toHex } from 'viem';
import { ARENA_ENGINE_ADDRESS, ARENA_ENGINE_ABI } from '@/lib/contract';
import { encodePredictions } from '@/lib/predictions';

export function useArenaCount() {
  return useReadContract({
    address: ARENA_ENGINE_ADDRESS,
    abi: ARENA_ENGINE_ABI,
    functionName: 'nextArenaId',
  });
}

export function useArena(arenaId: bigint) {
  return useReadContract({
    address: ARENA_ENGINE_ADDRESS,
    abi: ARENA_ENGINE_ABI,
    functionName: 'getArena',
    args: [arenaId],
  });
}

export function usePlayerState(arenaId: bigint, player?: `0x${string}`) {
  return useReadContract({
    address: ARENA_ENGINE_ADDRESS,
    abi: ARENA_ENGINE_ABI,
    functionName: 'getPlayerState',
    args: player ? [arenaId, player] : undefined,
    query: { enabled: !!player },
  });
}

export function useGodStreak(player?: `0x${string}`) {
  return useReadContract({
    address: ARENA_ENGINE_ADDRESS,
    abi: ARENA_ENGINE_ABI,
    functionName: 'godStreak',
    args: player ? [player] : undefined,
    query: { enabled: !!player },
  });
}

export function useEntryFee(tier: number) {
  return useReadContract({
    address: ARENA_ENGINE_ADDRESS,
    abi: ARENA_ENGINE_ABI,
    functionName: 'getEntryFee',
    args: [tier],
  });
}

export function useJoinArena() {
  const { writeContract } = useWriteContract();
  return (arenaId: bigint, entryFee: bigint) => {
    writeContract({
      address: ARENA_ENGINE_ADDRESS,
      abi: ARENA_ENGINE_ABI,
      functionName: 'joinArena',
      args: [arenaId],
      value: entryFee,
      gas: 200_000n,
      maxFeePerGas: 1_000_000n,
    });
  };
}

export function useCommitPrediction() {
  const { writeContract } = useWriteContract();
  const { address } = useAccount();

  return (arenaId: bigint, predictions: boolean[], salt: `0x${string}`) => {
    if (!address) return;

    const predWords = encodePredictions(predictions);

    // commitHash = keccak256(abi.encodePacked(arenaId, player, salt, keccak256(abi.encode(predWords))))
    const predHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters('uint256[]'),
        [predWords],
      ),
    );
    const commitHash = keccak256(
      encodePacked(
        ['uint256', 'address', 'bytes32', 'bytes32'],
        [arenaId, address, salt, predHash],
      ),
    );

    writeContract({
      address: ARENA_ENGINE_ADDRESS,
      abi: ARENA_ENGINE_ABI,
      functionName: 'commitPrediction',
      args: [arenaId, commitHash],
      gas: 100_000n,
      maxFeePerGas: 1_000_000n,
    });

    // Store predictions + salt locally for reveal
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `arena-${arenaId}-prediction`,
        JSON.stringify({
          predWords: predWords.map((w) => w.toString()),
          salt,
        }),
      );
    }
  };
}

export function useRevealPrediction() {
  const { writeContract } = useWriteContract();

  return (arenaId: bigint) => {
    const stored = localStorage.getItem(`arena-${arenaId}-prediction`);
    if (!stored) throw new Error('No stored prediction found');
    const { predWords, salt } = JSON.parse(stored);
    writeContract({
      address: ARENA_ENGINE_ADDRESS,
      abi: ARENA_ENGINE_ABI,
      functionName: 'revealPrediction',
      args: [arenaId, (predWords as string[]).map((w: string) => BigInt(w)), salt as `0x${string}`],
      gas: 200_000n,
      maxFeePerGas: 1_000_000n,
    });
  };
}

/** Generate a random salt for commitment */
export function generateSalt(): `0x${string}` {
  return keccak256(toHex(crypto.getRandomValues(new Uint8Array(32))));
}
