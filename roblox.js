// roblox.js — быстрый поиск Roblox-пользователя
// Параллельные запросы к прямым API + прокси (кто первый — тот и выиграл)

const ROBLOX_APIS = {
  userByName: 'https://users.roblox.com/v1/usernames/users',
  userById:   'https://users.roblox.com/v1/users/',
  avatar:     'https://thumbnails.roblox.com/v1/users/avatar-headshot',
  avatarFull: 'https://thumbnails.roblox.com/v1/users/avatar',
  friends:    'https://friends.roblox.com/v1/users/',
  search:     'https://users.roblox.com/v1/users/search',
};

const PROXIES = [
  (u) => u,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

async function fastFetch(url, options = {}) {
  const tries = PROXIES.map((p) =>
    fetch(p(url), options).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    })
  );
  return await Promise.any(tries);
}

async function findRobloxUser(username) {
  const body = JSON.stringify({
    usernames: [username],
    excludeBannedUsers: false,
  });

  const res = await fastFetch(ROBLOX_APIS.userByName, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'
