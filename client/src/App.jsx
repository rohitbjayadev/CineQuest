import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

const IMAGE = 'https://image.tmdb.org/t/p/w500';
const genres = [{ id: '', name: 'All genres' }, { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' }, { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' }];
const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
const moods = [{ id: 'feel_good', name: 'Feel-good' }, { id: 'intense', name: 'Intense' }, { id: 'mind_bending', name: 'Mind-bending' }, { id: 'romantic', name: 'Romantic' }, { id: 'scary', name: 'Scary' }];

function Poster({ movie, className = '' }) {
  return movie.posterUrl ? <img className={className} src={`${IMAGE}${movie.posterUrl}`} alt={`${movie.title} poster`} /> : <div className={`poster-fallback ${className}`}>No poster</div>;
}
function MovieCard({ movie, saved, onSelect, onToggle }) {
  return <article className="card"><button className="poster-button" onClick={() => onSelect(movie.id)}><Poster movie={movie} className="poster" /></button><div className="card-info"><button className="title-button" onClick={() => onSelect(movie.id)}>{movie.title}</button><div className="meta"><span>{movie.year || '—'}</span><span className="rating">★ {movie.rating?.toFixed(1) || '—'}</span></div><button className={`wish ${saved ? 'saved' : ''}`} onClick={() => onToggle(movie)} aria-label="Toggle wishlist">{saved ? '✓ Saved' : '+ Wishlist'}</button></div></article>;
}
function MovieModal({ movie, saved, onClose, onToggle }) {
  if (!movie) return null;
  const backdrop = movie.backdropUrl ? `${IMAGE}${movie.backdropUrl}` : undefined;
  return <div className="modal-wrap" role="dialog" aria-modal="true"><div className="modal-backdrop" onClick={onClose}/><section className="modal"><button className="close" onClick={onClose}>×</button>{backdrop && <img className="backdrop" src={backdrop} alt=""/>}<div className="detail"><Poster movie={movie} className="detail-poster"/><div><p className="eyebrow">{movie.releaseDate || 'Release date unavailable'} · {movie.runtime ? `${movie.runtime} min` : 'Runtime unavailable'}</p><h2>{movie.title}</h2><p className="rating">★ {movie.rating?.toFixed(1) || '—'} / 10</p><div className="tags">{movie.genres?.map(g => <span key={g}>{g}</span>)}</div><p className="overview">{movie.overview || 'No overview is available for this title.'}</p><button className={`wish primary ${saved ? 'saved' : ''}`} onClick={() => onToggle(movie)}>{saved ? '✓ Remove from wishlist' : '+ Add to wishlist'}</button></div></div></section></div>;
}
export default function App() {
  const [page, setPage] = useState('discover'), [section, setSection] = useState('popular');
  const [movies, setMovies] = useState([]), [wishlist, setWishlist] = useState([]), [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(''), [genre, setGenre] = useState(''), [year, setYear] = useState(''), [sort, setSort] = useState('popularity.desc'), [currentPage, setCurrentPage] = useState(1), [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [pickerMood, setPickerMood] = useState('feel_good'), [pickerTime, setPickerTime] = useState('any'), [pickerGenre, setPickerGenre] = useState('');
  const [pick, setPick] = useState(null), [picking, setPicking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchToken = useRef(0);
  const savedIds = new Set(wishlist.map(m => String(m.movieId || m.id)));
  const loadWishlist = useCallback(async () => { try { setWishlist((await api.wishlist()).items); } catch { setError('Wishlist could not be loaded.'); } }, []);
  useEffect(() => { loadWishlist(); }, [loadWishlist]);
  useEffect(() => {
    if (page === 'wishlist') { setLoading(false); return; }
    const token = ++searchToken.current;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = query.trim() ? await api.search({ query, page: currentPage }) : section === 'popular' ? await api.discover({ category: section, page: currentPage, genre, year, sort }) : await api.discover({ category: section, page: currentPage, genre, year, sort });
        if (token === searchToken.current) { setMovies(data.items); setTotalPages(data.totalPages); }
      } catch (e) { if (token === searchToken.current) setError(e.message); } finally { if (token === searchToken.current) setLoading(false); }
    }, query.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [page, section, query, genre, year, sort, currentPage]);
  const select = async id => { setPickerOpen(false); try { setSelected(await api.movie(id)); } catch (e) { setError(e.message); } };
  const toggle = async movie => { const id = String(movie.movieId || movie.id); try { if (savedIds.has(id)) await api.removeWishlist(id); else await api.addWishlist(movie); await loadWishlist(); } catch (e) { setError(e.message); } };
  const chooseMovie = async () => { setPicking(true); setError(''); try { setPick((await api.pick({ mood: pickerMood, runtime: pickerTime, genre: pickerGenre })).item); } catch (e) { setError(e.message); } finally { setPicking(false); } };
  const updateFilter = (setter, value) => { setter(value); setCurrentPage(1); };
  const display = page === 'wishlist' ? wishlist.map(m => ({ ...m, id: m.movieId || m.id, year: m.releaseDate?.slice(0,4), posterUrl: m.posterUrl })) : movies;
  return <><header><a className="brand" href="#" onClick={() => { setPage('discover'); setQuery(''); }}>CINE<span>QUEST</span></a><nav><button className={page === 'discover' ? 'active' : ''} onClick={() => setPage('discover')}>Discover</button><button className={page === 'wishlist' ? 'active' : ''} onClick={() => setPage('wishlist')}>My List <b>{wishlist.length}</b></button></nav></header><main>
    <section className="hero"><p className="kicker">YOUR NEXT FAVORITE FILM</p><h1>Find something<br/><em>unforgettable.</em></h1><p>Explore acclaimed classics, fresh releases, and everything in between.</p></section>
    <button className="quest-launcher" onClick={() => setPickerOpen(true)}><span>MOVIE NIGHT, SORTED</span><strong>Not sure what to watch?</strong><em>Start your quest →</em></button>{pickerOpen && <div className="picker-overlay" onClick={() => setPickerOpen(false)}><section className="night-picker" onClick={event => event.stopPropagation()}><button className="close-picker" aria-label="Close movie picker" onClick={() => setPickerOpen(false)}>×</button><div className="picker-copy"><p className="kicker">MOVIE NIGHT, SORTED</p><h2>Not sure what to watch?</h2><p>Tell us the vibe and we’ll choose one for you.</p></div><div className="picker-controls"><select value={pickerMood} onChange={e => setPickerMood(e.target.value)}>{moods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><select value={pickerTime} onChange={e => setPickerTime(e.target.value)}><option value="any">Any length</option><option value="short">Under 90 min</option><option value="standard">90–120 min</option><option value="long">2+ hours</option></select><select value={pickerGenre} onChange={e => setPickerGenre(e.target.value)}>{genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="pick-button" disabled={picking} onClick={chooseMovie}>{picking ? 'Choosing...' : 'Pick my movie'}</button><button className="clear-pick" disabled={!pick || picking} onClick={() => setPick(null)}>Clear</button></div>{pick && <div className="pick-result"><Poster movie={pick} className="pick-poster"/><div><p className="kicker">TONIGHT’S PICK</p><h3>{pick.title}</h3><p className="rating">Rating {pick.rating?.toFixed(1) || '—'} · {pick.year || 'Release date unavailable'}</p><p>{pick.reason}</p><div className="pick-actions"><button className="wish" onClick={() => select(pick.id)}>View details</button><button className={`wish ${savedIds.has(String(pick.id)) ? 'saved' : ''}`} onClick={() => toggle(pick)}>{savedIds.has(String(pick.id)) ? 'Saved' : '+ Save for later'}</button></div></div></div>}</section></div>}
    {page === 'discover' && <><div className="toolbar"><input value={query} onChange={e => updateFilter(setQuery, e.target.value)} placeholder="Search films, actors, directors..." aria-label="Search movies"/><select value={genre} onChange={e => updateFilter(setGenre, e.target.value)}>{genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={year} onChange={e => updateFilter(setYear, e.target.value)}><option value="">Any year</option>{years.map(y => <option key={y}>{y}</option>)}</select><select value={sort} onChange={e => updateFilter(setSort, e.target.value)}><option value="popularity.desc">Most popular</option><option value="vote_average.desc">Top rated</option><option value="primary_release_date.desc">Newest</option></select></div><div className="tabs">{[['popular','Popular'],['top_rated','Top Rated'],['upcoming','Upcoming'],['now_playing','Now Playing']].map(([key,label]) => <button key={key} className={section === key && !query ? 'active' : ''} onClick={() => { setSection(key); setQuery(''); setCurrentPage(1); }}>{label}</button>)}</div></>}
    <div className="results-title"><h2>{page === 'wishlist' ? 'My Wishlist' : query ? `Results for “${query}”` : section.replace('_',' ')}</h2>{page === 'discover' && <span>Page {currentPage} of {totalPages}</span>}</div>
    {error && <div className="state error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}{loading ? <div className="state">Loading great movies…</div> : display.length ? <div className="grid">{display.map(movie => <MovieCard key={movie.movieId || movie.id} movie={movie} saved={savedIds.has(String(movie.movieId || movie.id))} onSelect={select} onToggle={toggle}/>)}</div> : <div className="state">{page === 'wishlist' ? 'Your wishlist is waiting for its first movie.' : 'No movies found. Try another search or filter.'}</div>}
    {page === 'discover' && !loading && <div className="pagination"><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Previous</button><button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button></div>}
  </main><MovieModal movie={selected} saved={selected && savedIds.has(String(selected.id))} onClose={() => setSelected(null)} onToggle={toggle}/></>;
}
