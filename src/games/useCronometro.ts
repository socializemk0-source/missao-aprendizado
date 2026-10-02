import { useEffect, useState } from 'react';

// Segundos desde que o jogo abriu (só para mostrar; quem conta o tempo que
// vale recorde é o servidor).
export function useCronometro(): number {
  const [inicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(inicio);
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((agora - inicio) / 1000));
}
