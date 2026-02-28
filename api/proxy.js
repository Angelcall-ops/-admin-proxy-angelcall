// api/proxy.js — Final Path Routes

const N8N_ROUTES = {
  '/admin-login':             'https://n8n.angelcall.fr/webhook/admin-login',
  '/admin-apisession':        'https://n8n.angelcall.fr/webhook/admin-apisession',
  '/admin-apirestaurants':    'https://n8n.angelcall.fr/webhook/admin-apirestaurants',
  '/admin-save':              'https://n8n.angelcall.fr/webhook/admin-save',
  '/admin-apigenerate-prompt':'https://n8n.angelcall.fr/webhook/admin-apigenerate-prompt',
  '/admin-delete':            'https://n8n.angelcall.fr/webhook/admin-delete',
  '/admin-logout':            'https://n8n.angelcall.fr/webhook/admin-logout',
  '/admin-apirefresh-analytics': 'https://n8n.angelcall.fr/webhook/admin-apirefresh-analytics'
};

export default async function handler(req) {
  const url  = new URL(req.url, `https://${req.headers.get('host')}`);
  
  let path = url.pathname;
  if (path.startsWith('/admin-path')) {
    path = path.replace('/admin-path', '');
  }

  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin !== '*' ? origin : 'https://admin-proxy-angelcall.vercel.app',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Set-Cookie'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const targetUrl = N8N_ROUTES[path];
  
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Route non trouvée', path }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = !['GET', 'HEAD'].includes(req.method) ? await req.text() : undefined;

    const forwardHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const incomingCookie = req.headers.get('cookie');
    if (incomingCookie) {
      forwardHeaders['Cookie'] = incomingCookie;
    }

    const n8nRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

    // Transfert du cookie magique n8n vers le navigateur
    const setCookie = n8nRes.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie;
    }

    const data = await n8nRes.text();

    return new Response(data, {
      status: n8nRes.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy erreur', details: error.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  runtime: 'edge',
};