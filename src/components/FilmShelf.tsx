import Link from "next/link";
import FilmCard from "./FilmCard";
import ShelfScroller from "./ShelfScroller";
import type { Film } from "@/lib/types";

export interface ShelfItem {
  film: Film;
  badge?: { emoji: string; label: string };
  watchlist?: {
    inList: boolean;
    addLabel: string;
    removeLabel: string;
    inListLabel: string;
  };
}

interface Props {
  title: string;
  seeAllHref: string;
  seeAllLabel: string;
  prevLabel: string;
  nextLabel: string;
  items: ShelfItem[];
}

// Ana sayfa rafı: yatay kaydırılan kart şeridi + "Tümünü gör" bağlantısı.
// Boş raf kendini gizler (arşiv büyüdükçe raflar kendiliğinden dolar).
export default function FilmShelf({
  title,
  seeAllHref,
  seeAllLabel,
  prevLabel,
  nextLabel,
  items,
}: Props) {
  if (items.length === 0) return null;
  return (
    // Alt bölümlerden (max-w-5xl) daha geniş ama kenarlardan nefes payı
    // bırakan orta yol: ortalanmış geniş kolon
    <section className="mx-auto w-full max-w-7xl">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        <Link
          href={seeAllHref}
          className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-accent"
        >
          {seeAllLabel}
        </Link>
      </div>
      <ShelfScroller prevLabel={prevLabel} nextLabel={nextLabel}>
        {items.map(({ film, badge, watchlist }) => (
          <div key={film.tmdbId} className="w-48 shrink-0 sm:w-56">
            <FilmCard film={film} badge={badge} watchlist={watchlist} plain />
          </div>
        ))}
      </ShelfScroller>
    </section>
  );
}
