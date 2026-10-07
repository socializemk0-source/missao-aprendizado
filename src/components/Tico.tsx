// Tico, a capivara mascote — imagem fixa e leve (WebP, ~40 KB). Animação fica
// para um artista depois que o produto for validado.

export type TicoPose = 'neutro' | 'acenando' | 'comemorando' | 'apontando' | 'joinha' | 'estrela';

// loading="lazy" só para o Tico fora da primeira tela (ex.: fim da página inicial).
export function Tico({ pose = 'neutro', className = 'tico', alt = 'Tico, a capivara exploradora', loading }: { pose?: TicoPose; className?: string; alt?: string; loading?: 'lazy' }) {
  return <img src={`/tico/${pose}.webp`} alt={alt} className={className} width={512} height={512} decoding="async" loading={loading} />;
}
