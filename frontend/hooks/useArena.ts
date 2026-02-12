'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { parseEther, keccak256, encodePacked } from 'viem';
import { ARENA_ENGINE_ADDRESS, ARENA_ENGINE_ABI } from '@/lib/contract';

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

  return (arenaId: bigint, predictions: bigint, salt: `0x${string}`) => {
    if (!address) return;
    const commitHash = keccak256(
      encodePacked(
        ['uint256', 'address', 'bytes32', 'uint256'],
        [arenaId, address, salt, predictions]
      )
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
        JSON.stringify({ predictions: predictions.toString(), salt })
      );
    }
  };
}

export function useRevealPrediction() {
  const { writeContract } = useWriteContract();

  return (arenaId: bigint) => {
    const stored = localStorage.getItem(`arena-${arenaId}-prediction`);
    if (!stored) throw new Error('No stored prediction found');
    const { predictions, salt } = JSON.parse(stored);
    writeContract({
      address: ARENA_ENGINE_ADDRESS,
      abi: ARENA_ENGINE_ABI,
      functionName: 'revealPrediction',
      args: [arenaId, BigInt(predictions), salt as `0x${string}`],
      gas: 100_000n,
      maxFeePerGas: 1_000_000n,
    });
  };
}
