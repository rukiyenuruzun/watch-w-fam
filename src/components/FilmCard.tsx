import Image from "next/image";
import Link from "next/link";
import WatchlistToggle from "@/components/WatchlistToggle";
import type { Film } from "@/lib/types";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";

interface Props {
  film: Film;
  // Analizi tamamlanmış filmlerde hüküm rozeti (emoji + açıklama)
  badge?: { emoji: string; label: string };
  // Verilirse posterin köşesinde izleme listesi yer imi gösterilir
  watchlist?: {
    inList: boolean;
    addLabel: string;
    removeLabel: string;
    inListLabel: string;
  };
  // Raf görünümü: çerçevesiz/kutusuz, yalnızca poster + alt yazı
  plain?: boolean;
}

export default function FilmCard({ film, badge, watchlist, plain = false }: Props) {
  return (
    <Link
      href={`/film/${film.tmdbId}`}
      className={`group overflow-hidden rounded-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 ${
        plain ? "" : "border border-line bg-surface hover:border-accent/60"
      }`}
    >
      <div className="relative aspect-2/3 overflow-hidden bg-surface-2">
        {film.posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE}/w500${film.posterPath}`}
            alt={film.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted">
            {film.title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        {watchlist && (
          <WatchlistToggle tmdbId={film.tmdbId} variant="icon" {...watchlist} />
        )}
        {typeof film.voteAverage === "number" && film.voteAverage > 0 && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
            ★ {film.voteAverage.toFixed(1)}
          </span>
        )}
        {badge && (
          <span
            title={badge.label}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-1 text-base leading-none"
          >
            {badge.emoji}
          </span>
        )}
      </div>
      <div className={plain ? "px-1 py-2" : "p-3"}>
        <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-accent">
          {film.title}
        </h3>
        <p className="text-xs text-muted">{film.releaseYear ?? "—"}</p>
      </div>
    </Link>
  );
}
