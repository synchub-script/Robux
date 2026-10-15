// roblox.js — функции для работы с Roblox API через CORS-прокси

const USERS_API = 'https://users.roblox.com/v1/usernames/users';
const THUMB_API = 'https://thumbnails.roblox.com/v1/users/avatar-headshot';

// Список прокси для обхода CORS
const PROXIES = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://cors.eu.org/${url}`,
];

async function proxiedFetch(url, options = {}) {
  // 1. Пробуем напрямую
  try {
    const r = await fetch(url, options);
    if (r.ok) return r;
  } catch (e) { /* CORS или сеть */ }

  // 2. Пробуем через прокси по очереди
  for (const p of PROXIES) {
    try {
      const r = await fetch(p(url), options);
      if (r.ok) return r;
    } catch (e) { /* следующий прокси */ }
  }
  throw new Error('Не удалось подключиться к Roblox API');
}

/**
 * Ищет пользователя по нику
 * @returns {Promise<{id:number, name:string, displayName:string}>}
 */
async function findRobloxUser(username) {
  const body = JSON.stringify({
    usernames: [username],
    excludeBannedUsers: false,
  });

  const res = await proxiedFetch(USERS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    throw new Error('Пользователь с таким ником не найден');
  }
  return data.data[0];
}

/**
 * Получает URL аватара по ID пользователя
 * @returns {Promise<string|null>}
 */
async function getRobloxAvatar(userId) {
  const url = `${THUMB_API}?userIds=${userId}&size=420x420&format=Png&isCircular=false`;

  // Повторяем пару раз, если аватар ещё генерируется (state: Pending)
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await proxiedFetch(url);
    const data = await res.json();
    if (data.data && data.data[0]) {
      const item = data.data[0];
      if (item.state === 'Completed' && item.imageUrl) return item.imageUrl;
      if (item.state === 'Pending') {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
    }
    break;
  }
  return null;
}
