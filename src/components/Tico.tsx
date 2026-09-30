// Tico, a capivara mascote — imagem fixa e leve (WebP, ~40 KB). Animação fica
// para um artista depois que o produto for validado.

export type TicoPose = 'neutro' | 'acenando' | 'comemorando' | 'apontando' | 'joinha' | 'estrela';

export function Tico({ pose = 'neutro', className = 'tico', alt = 'Tico, a capivara exploradora' }: { pose?: TicoPose; className?: string; alt?: string }) {
  return <img src={`/tico/${pose}.webp`} alt={alt} className={className} width={512} height={512} decoding="async" />;
}
