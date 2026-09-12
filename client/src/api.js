const request = async (path, options) => {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong. Please try again.');
  return body;
};
export const api = {
  popular: () => request('/movies/popular'),
  discover: (params) => request(`/movies/discover?${new URLSearchParams(params)}`),
  pick: (params) => request(`/movies/pick?${new URLSearchParams(params)}`),
  search: (params) => request(`/movies/search?${new URLSearchParams(params)}`),
  movie: (id) => request(`/movies/${id}`),
  wishlist: () => request('/wishlist'),
  addWishlist: (movie) => request('/wishlist', { method: 'POST', body: JSON.stringify(movie) }),
  removeWishlist: (id) => request(`/wishlist/${id}`, { method: 'DELETE' })
};
