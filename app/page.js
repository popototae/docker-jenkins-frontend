"use client";

import { useState, useEffect } from "react";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [favorites, setFavorites] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("attraction-favorites-v1") || "[]");
      if (Array.isArray(saved)) {
        setFavorites(saved.filter((id) => typeof id === "number" || typeof id === "string"));
      }
    } catch {
      // A damaged or blocked browser storage must not prevent browsing.
    }
    setFavoritesReady(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function getAttractions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/attractions", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid attractions response");
        if (!controller.signal.aborted) setRows(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    getAttractions();
    return () => controller.abort();
  }, [reloadCount]);

  function toggleFavorite(id) {
    const next = favorites.includes(id)
      ? favorites.filter((favoriteId) => favoriteId !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("attraction-favorites-v1", JSON.stringify(next));
    } catch {
      // Favorites still work for this visit if browser storage is blocked.
    }
  }

  function resetFilters() {
    setQuery("");
    setSort("default");
    setFavoritesOnly(false);
  }

  const search = query.trim().toLocaleLowerCase();
  const visibleRows = rows.filter((row) => {
    const matchesSearch = `${row.name} ${row.detail || ""}`.toLocaleLowerCase().includes(search);
    return matchesSearch && (!favoritesOnly || favorites.includes(row.id));
  });
  if (sort !== "default") {
    visibleRows.sort((a, b) => sort === "name-asc"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name));
  }

  if (loading) {
    return (
      <main className="container">
        <div className="empty" role="status">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <div className="empty" role="alert">
          <p>Error: {error}</p>
          <button className="button" onClick={() => setReloadCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <p className="eyebrow">YOUR NEXT LITTLE ADVENTURE</p>
        <h1 className="title">Attractions</h1>
        <p className="subtitle">Find a place to explore. Save the ones you love.</p>
      </header>

      <section className="toolbar" aria-label="Filter attractions">
        <div className="field search-field">
          <label htmlFor="search">Search attractions</label>
          <input id="search" type="search" placeholder="Search a name or description..."
            value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="default">Original order</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)} />
          Favorites only
        </label>
        <button className="button secondary" onClick={resetFilters}>Clear filters</button>
      </section>

      <p className="results" role="status">
        Showing {visibleRows.length} of {rows.length} attractions · {favorites.length} favorites
      </p>

      {visibleRows.length === 0 ? (
        <div className="empty">
          {rows.length === 0 ? "No attractions found." : "No attractions match your filters."}
        </div>
      ) : (
        <section className="grid" aria-label="Attractions">
          {visibleRows.map((x) => (
            <article key={x.id} className="card" aria-label={x.name}>
              {x.coverimage && (
                <div className="media">
                  <img
                    src={x.coverimage}
                    alt={x.name}
                    className="img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className="body">
                <h2 className="card-title">{x.name}</h2>
                {x.detail && <p className="detail">{x.detail}</p>}
                <button className="button favorite" aria-label={`Favorite ${x.name}`}
                  aria-pressed={favorites.includes(x.id)} disabled={!favoritesReady}
                  onClick={() => toggleFavorite(x.id)}>
                  {favorites.includes(x.id) ? "♥ Saved" : "♡ Save favorite"}
                </button>
                <details className="location">
                  <summary>View details</summary>
                  {x.detail && <p>{x.detail}</p>}
                  <p className="meta">
                    Lat: <span className="code">{x.latitude}</span> · Lng:{" "}
                    <span className="code">{x.longitude}</span>
                  </p>
                </details>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
