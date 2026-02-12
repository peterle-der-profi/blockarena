'use client';

import { useEffect, useState, useRef } from 'react';

interface MiniBlock {
  number: string;
  hash: string;
  timestamp: string;
}

export function useMiniBlocks() {
  const [latestBlock, setLatestBlock] = useState<MiniBlock | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint>(0n);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('wss://carrot.megaeth.com/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['newHeads'],
            id: 1,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.method === 'eth_subscription' && data.params?.result) {
            const block = data.params.result;
            setLatestBlock(block);
            setBlockNumber(BigInt(block.number));
          }
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connect, 1000);
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  return { latestBlock, blockNumber };
}
