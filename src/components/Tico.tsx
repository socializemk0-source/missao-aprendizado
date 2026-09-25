// Tico, a capivara mascote — imagem fixa por enquanto (sem animação).

export type TicoPose = 'neutro' | 'acenando' | 'comemorando' | 'apontando' | 'joinha' | 'estrela';

export function Tico({ pose = 'neutro', className = 'tico', alt = 'Tico, a capivara exploradora' }: { pose?: TicoPose; className?: string; alt?: string }) {
  return <img src={`/tico/${pose}.png`} alt={alt} className={className} width={512} height={512} />;
}
