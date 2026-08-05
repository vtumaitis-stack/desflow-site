const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'desflow';
const KEY = 'state';
// Not real security -- just a shared token so a random visitor who finds this
// URL by guessing can't casually overwrite the data. Anyone with access to the
// page source (i.e. anyone using the app) can see it, same as the admin PIN.
const SYNC_SECRET = 'df-9f3a1c7e-sync';
const CORS_HEADERS = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Secret',
'Content-Type': 'application/json; charset=utf-8'
};

exports.handler = async function(event){
if(event.httpMethod === 'OPTIONS'){
return { statusCode: 204, headers: CORS_HEADERS, body: '' };
}

const provided = (event.headers && (event.headers['x-sync-secret'] || event.headers['X-Sync-Secret'])) || '';
if(provided !== SYNC_SECRET){
return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'unauthorized' }) };
}

let store;
try{
store = getStore({ name: STORE_NAME, consistency: 'strong' });
}catch(e){
return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'blob store unavailable', detail: String(e && e.message || e) }) };
}

if(event.httpMethod === 'GET'){
try{
const data = await store.get(KEY, { type: 'json' });
return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ state: data || null }) };
}catch(e){
return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'read failed', detail: String(e && e.message || e) }) };
}
}

if(event.httpMethod === 'POST'){
let body;
try{
body = JSON.parse(event.body || '');
}catch(e){
return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid json' }) };
}
if(!body || typeof body !== 'object' || Array.isArray(body)){
return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid state payload' }) };
}
try{
await store.setJSON(KEY, body);
return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, savedAt: new Date().toISOString() }) };
}catch(e){
return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'write failed', detail: String(e && e.message || e) }) };
}
}

return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'method not allowed' }) };
};
