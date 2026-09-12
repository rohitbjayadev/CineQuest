import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express(), PORT = process.env.PORT || 5000;
app.use(cors()); app.use(express.json({ limit: '20kb' }));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userId:{type:String,default:'demo'}, movieId:{type:String,required:true}, title:String, posterUrl:String, rating:Number, releaseDate:String, addedAt:{type:Date,default:Date.now} }, { versionKey:false }));
let databaseReady = false, memoryWishlist = [];
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => { databaseReady = true; console.log('MongoDB connected'); }).catch(() => console.warn('MongoDB unavailable; using temporary local wishlist.'));
const cache = new Map();
const tmdb = async (path, query = {}) => {
  const key = `${path}?${new URLSearchParams(query)}`, hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw Object.assign(new Error('TMDB_API_KEY is not configured on the server.'), { status: 503 });
  const headers = apiKey.startsWith('eyJ') ? { Authorization:`Bearer ${apiKey}` } : {};
  const params = new URLSearchParams(query);
  if (!apiKey.startsWith('eyJ')) params.set('api_key', apiKey);

  // Connections to TMDB can occasionally be reset by an ISP. Retry only
  // network failures; 4xx/5xx responses are returned immediately.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}?${params}`, { headers, signal:controller.signal });
      if (!res.ok) throw Object.assign(new Error('Movie service is unavailable. Please try again shortly.'), { status:res.status });
      const data = await res.json();
      cache.set(key, { data, expires:Date.now()+300000 });
      return data;
    } catch (error) {
      if (error.status || attempt === 2) {
        if (!error.status && error.name !== 'AbortError') error.message = 'Cannot reach TMDB. Check your network connection and try again.';
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    } finally { clearTimeout(timeout); }
  }
};
const normalize = m => ({ id:m.id, title:m.title || m.name || 'Untitled', posterUrl:m.poster_path || null, backdropUrl:m.backdrop_path || null, rating:Number(m.vote_average || 0), releaseDate:m.release_date || '', year:(m.release_date || '').slice(0,4), overview:m.overview || '', genres:(m.genres || []).map(g => g.name) });
const list = (data) => ({ items:(data.results || []).map(normalize), page:data.page || 1, totalPages:Math.min(data.total_pages || 1, 500) });
const safePage = p => Math.min(Math.max(Number.parseInt(p,10) || 1,1),500);
app.get('/api/movies/popular', async (req,res,next) => { try { res.json(list(await tmdb('/movie/popular',{page:safePage(req.query.page)}))); } catch(e){next(e)} });
app.get('/api/movies/search', async (req,res,next) => { const query = String(req.query.query || '').trim(); if (!query || query.length > 120) return res.status(400).json({message:'Enter a movie title up to 120 characters.'}); try { res.json(list(await tmdb('/search/movie',{query,page:safePage(req.query.page),include_adult:'false'}))); } catch(e){next(e)} });
app.get('/api/movies/discover', async (req,res,next) => {
  const category = ['popular','top_rated','upcoming','now_playing'].includes(req.query.category) ? req.query.category : 'popular';
  const q = { page:safePage(req.query.page), include_adult:'false', include_video:'false', sort_by:'popularity.desc' };
  const allowedSorts = ['popularity.desc','vote_average.desc','primary_release_date.desc'];
  if (allowedSorts.includes(req.query.sort)) q.sort_by = req.query.sort;
  if (req.query.genre && /^\d+$/.test(req.query.genre)) q.with_genres = req.query.genre;
  if (/^\d{4}$/.test(req.query.year)) q.primary_release_year = req.query.year;

  // TMDB's category endpoints do not honor sorting. Apply each category as a
  // discover constraint instead, so filters and the selected sort work together.
  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  const upcomingLimit = new Date(todayDate);
  upcomingLimit.setFullYear(upcomingLimit.getFullYear() + 1);
  // Exclude TMDB placeholder titles dated many years in the future.
  q['primary_release_date.lte'] = today;
  if (category === 'upcoming') {
    q['primary_release_date.gte'] = today;
    q['primary_release_date.lte'] = upcomingLimit.toISOString().slice(0, 10);
  }
  if (category === 'now_playing') {
    const recent = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    q['primary_release_date.gte'] = recent;
    q['primary_release_date.lte'] = today;
  }
  if (category === 'top_rated') q['vote_count.gte'] = 200;
  try { res.json(list(await tmdb('/discover/movie',q))); } catch(e){next(e)}
});
app.get('/api/movies/pick', async (req,res,next) => {
  const moodGenres = { feel_good:'35|16|10751', intense:'28|53|80', mind_bending:'878|9648|53', romantic:'10749|35', scary:'27|53' };
  const mood = moodGenres[req.query.mood] ? req.query.mood : 'feel_good';
  const q = { include_adult:'false', include_video:'false', sort_by:'popularity.desc', 'vote_count.gte':100, 'primary_release_date.lte':new Date().toISOString().slice(0,10) };
  q.with_genres = /^\d+$/.test(req.query.genre || '') ? req.query.genre : moodGenres[mood];
  if (req.query.runtime === 'short') q['with_runtime.lte'] = 90;
  if (req.query.runtime === 'standard') { q['with_runtime.gte'] = 91; q['with_runtime.lte'] = 120; }
  if (req.query.runtime === 'long') q['with_runtime.gte'] = 121;
  try {
    const data = await tmdb('/discover/movie', q);
    const choices = (data.results || []).filter(movie => movie.poster_path);
    if (!choices.length) return res.status(404).json({message:'No matching movie found. Try a different mood or duration.'});
    const movie = normalize(choices[Math.floor(Math.random() * Math.min(choices.length, 20))]);
    const timeText = { short:'under 90 minutes', standard:'90–120 minutes', long:'over two hours', any:'any runtime' }[req.query.runtime] || 'any runtime';
    movie.reason = `A ${mood.replace('_',' ')} pick with a ${timeText} runtime and strong audience interest.`;
    res.json({item:movie});
  } catch(e){next(e)}
});
app.get('/api/movies/:id', async (req,res,next) => { if (!/^\d+$/.test(req.params.id)) return res.status(400).json({message:'Invalid movie ID.'}); try { const m=await tmdb(`/movie/${req.params.id}`); res.json({...normalize(m),runtime:m.runtime || null}); } catch(e){next(e)} });
app.get('/api/wishlist', async (req,res,next) => { try { const items=databaseReady ? await Wishlist.find({userId:'demo'}).sort({addedAt:-1}).lean() : memoryWishlist; res.json({items}); } catch(e){next(e)} });
app.post('/api/wishlist', async (req,res,next) => { const {id,movieId,title,posterUrl,rating,releaseDate}=req.body || {}, finalId=String(movieId || id || ''); if (!/^\d+$/.test(finalId) || !title || title.length>300) return res.status(400).json({message:'A valid movie ID and title are required.'}); const item={userId:'demo',movieId:finalId,title,posterUrl:posterUrl || null,rating:Number(rating)||0,releaseDate:releaseDate || '',addedAt:new Date()}; try { if(databaseReady){ const existing=await Wishlist.findOne({userId:'demo',movieId:finalId}); if(existing)return res.status(200).json(existing); const saved=await Wishlist.create(item); return res.status(201).json(saved); } if(!memoryWishlist.some(x=>x.movieId===finalId)) memoryWishlist.unshift(item); res.status(201).json(item); }catch(e){next(e)} });
app.delete('/api/wishlist/:movieId', async (req,res,next) => { if(!/^\d+$/.test(req.params.movieId)) return res.status(400).json({message:'Invalid movie ID.'}); try { if(databaseReady) await Wishlist.deleteOne({userId:'demo',movieId:req.params.movieId}); else memoryWishlist=memoryWishlist.filter(x=>x.movieId!==req.params.movieId); res.status(204).end(); }catch(e){next(e)} });
app.use((err,req,res,next) => { console.error(err.message); res.status(err.status || 500).json({message:err.name==='AbortError'?'Movie service timed out. Please try again.':err.message || 'Unexpected server error.'}); });
app.listen(PORT,()=>console.log(`API on http://localhost:${PORT}`));
