// api/proxy.js — AngelCall Secure Proxy V2.0
// Conserve le routing par map, corrige les 4 failles critiques

// ✅ FAILLE 4 CORRIGÉE : URLs dans les variables d'env Vercel, jamais dans le code
const N8N_ROUTES = {
  '/admin-login':           process.env.N8N_ROUTE_LOGIN,
  '/admin-apisession':      process.env.N8N_ROUTE_SESSION,
  '/admin-apirestaurants':  process.env.N8N_ROUTE_RESTAURANTS,
  '/admin-save':            process.env.N8N_ROUTE_SAVE,
  '/admin-apigenerate-prompt': process.env.N8N_ROUTE_GENERATE_PROMPT,
  '/admin-delete':          process.env.N8N_ROUTE_DELETE,
};

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://admin-proxy-angelcall.vercel.app';

export default async function handler(req) {
  const url  = new URL(req.url, `https://${req.headers.get('host')}`);
  const path = url.pathname.replace(/^\/admin-path/, ''); // strip le préfixe Vercel rewrite

  // ✅ FAILLE 3 CORRIGÉE : Preflight OPTIONS → réponse 204 immédiate
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req.headers.get('origin')),
    });
  }

  const targetUrl = N8N_ROUTES[path];
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Route inconnue', path }), {
      status: 404,
      headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = !['GET', 'HEAD'].includes(req.method) ? await req.text() : undefined;

    // ✅ FAILLE 1 CORRIGÉE : relay du Cookie entrant vers n8n
    const forwardHeaders = {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    };
    const incomingCookie = req.headers.get('cookie');
    if (incomingCookie) {
      forwardHeaders['Cookie'] = incomingCookie; // sessiontoken relayé à n8n
    }

    const n8nRes = await fetch(targetUrl, {
      method:  req.method,
      headers: forwardHeaders,
      body,
    });

    // ✅ FAILLE 2 CORRIGÉE : relay du Set-Cookie de n8n + Origin explicite
    const responseHeaders = {
      ...corsHeaders(req.headers.get('origin')),
      'Content-Type': 'application/json',
    };

    // Copie le Set-Cookie de n8n (pose du sessiontoken HTTP-Only après login)
    const setCookie = n8nRes.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie;
    }

    const data = await n8nRes.text(); // text() pour ne pas crasher si n8n renvoie du non-JSON

    return new Response(data, {
      status:  n8nRes.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Proxy erreur', details: error.message }),
      {
        status:  502,
        headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      }
    );
  }
}

// Génère les headers CORS corrects — credentials impose un Origin explicite, jamais *
function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Credentials': 'true',         // ← obligatoire pour credentials:include
    'Access-Control-Allow-Methods':     'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization',
    'Access-Control-Expose-Headers':    'Set-Cookie',
    'Vary':                             'Origin',
  };
}

export const config = {
  runtime: 'edge', // conservé — Edge Runtime est parfait pour ce use-case
};
