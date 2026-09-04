import type { CurrentAffair } from '../types';
import { TopBar } from '../components/TopBar';

export function CurrentPage({ items }: { items: CurrentAffair[] }) {
  return (
    <div className="page-wrap">
      <TopBar title="Current Affairs" subtitle="Relevant, linked and revision-ready" />
      <div className="filter-row"><button className="filter active">All</button><button className="filter">Prelims</button><button className="filter">Mains</button><button className="filter">PIB</button></div>
      <section className="article-list">
        {items.map(item => (
          <article className="article-card" key={item.id}>
            <div className="article-meta"><span>{item.subject}</span><time>{item.publishedAt}</time></div>
            <h2>{item.title}</h2><p>{item.summary}</p>
            <div className="tag-row">{item.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
            <div className="article-foot"><small>Source: {item.source}</small><button className="text-btn">Read analysis</button></div>
          </article>
        ))}
      </section>
    </div>
  );
}
