import { Tico } from '../components/Tico';

export function EmConstrucao({ title, readyIn }: { title: string; readyIn?: string }) {
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="eyebrow">Em construção</p>
        <h1 className="page-title">{title}</h1>
        <p>Esta parte chega {readyIn ? `na ${readyIn} do V2` : 'em breve'}. O Tico já está preparando tudo.</p>
      </div>
      <Tico pose="apontando" />
    </section>
  );
}
