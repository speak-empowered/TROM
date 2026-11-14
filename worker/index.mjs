const topics = new Set(['book', 'coaching', 'events', 'media', 'podcast', 'brotherhood', 'general']);
const maxBodyBytes = 64 * 1024;

function submissionResponse(request, status, error) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('Accept')?.includes('application/json')) {
    return Response.json(error ? { error } : { received: true }, { status, headers });
  }
  if (error) return new Response(error, { status, headers });
  return new Response(null, { status: 303, headers: { ...headers, Location: '/contact.html?received=1#contact-status' } });
}

async function submitContact(request, env, url) {
  const fail = (status, message) => submissionResponse(request, status, message);
  const origin = request.headers.get('Origin');
  if (origin !== url.origin && request.headers.get('Sec-Fetch-Site') !== 'same-origin') {
    return fail(403, 'Please send your message from the contact page.');
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
    return fail(415, 'Please use the contact form to send your message.');
  }
  if (Number(request.headers.get('Content-Length')) > maxBodyBytes) {
    return fail(413, 'Your message is too large.');
  }
  if (!request.body) return fail(400, 'Please complete the contact form.');

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBodyBytes) {
      await reader.cancel();
      return fail(413, 'Your message is too large.');
    }
    body += decoder.decode(value, { stream: true });
  }
  const fields = new URLSearchParams(body + decoder.decode());
  if (fields.get('website')) return fail(400, 'Please leave the website field blank.');
  const name = fields.get('name')?.trim() ?? '';
  const email = fields.get('email')?.trim() ?? '';
  const topic = fields.get('topic') ?? '';
  const message = fields.get('message')?.trim() ?? '';
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email) ||
      !topics.has(topic) || !message || message.length > 5000) {
    return fail(400, 'Please enter your name, a valid email, a topic, and a message.');
  }

  try {
    await env.DB.prepare(
      'INSERT INTO contact_messages (id, name, email, topic, message) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), name, email, topic, message).run();
  } catch (error) {
    console.error('Contact storage failed:', error?.message);
    return fail(503, 'We couldn’t save your message. Please try again.');
  }
  return submissionResponse(request, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') return submitContact(request, env, url);
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    let key;
    try {
      key = url.pathname === '/' ? '/index.html' : decodeURI(url.pathname);
    } catch {
      return new Response('Invalid address', { status: 400 });
    }
    const file = Object.hasOwn(assets, key) ? assets[key] : assets[key + '.html'];
    if (!file) return new Response('Page not found', { status: 404 });
    const [type, base64] = file;
    if (request.method === 'HEAD') return new Response(null, { headers: { 'Content-Type': type } });
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    if ((key === '/contact.html' || key === '/contact') && url.searchParams.has('received')) {
      const page = new TextDecoder().decode(bytes).replace(
        'id="contact-status" role="status" tabindex="-1"></p>',
        'id="contact-status" role="status" tabindex="-1">Thanks for reaching out. We received your message.</p>'
      );
      return new Response(page, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    }
    return new Response(bytes, { headers: { 'Content-Type': type } });
  },
};
