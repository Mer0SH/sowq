// Reads credentials from stdin without putting them in command arguments.
let raw = '';
process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const credentials = await new Promise((resolve, reject) => {
  const finish = () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    try { resolve(JSON.parse(raw.trim())); } catch { reject(new Error('Invalid input.')); }
  };
  process.stdin.on('data', chunk => {
    raw += chunk;
    if (raw.length > 1000) reject(new Error('Input too long.'));
    if (process.stdin.isTTY && /[\r\n]/.test(raw)) finish();
  });
  process.stdin.on('end', finish);
});
const response = await fetch('http://127.0.0.1:4000/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
});
const result = await response.json();
console.log(JSON.stringify({ httpStatus: response.status, loggedIn: result.ok === true, owner: result.data?.staff?.role === 'owner' }));
if (!response.ok || result.data?.staff?.role !== 'owner') process.exitCode = 1;
