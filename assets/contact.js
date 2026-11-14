const form = document.querySelector('#contact-form');
const topic = form.elements.topic;
const status = document.querySelector('#contact-status');
const button = form.querySelector('button');
const requestedTopic = new URL(location.href).searchParams.get('topic');
const legacyTopics = { '#coaching': 'coaching', '#events': 'events', '#community': 'brotherhood' };
const selectedTopic = requestedTopic ?? legacyTopics[location.hash];
if (Array.from(topic.options).some(option => option.value === selectedTopic)) {
  topic.value = selectedTopic;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  status.textContent = 'Sending your message…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams(new FormData(form)),
    });
    const result = await response.json();
    if (!response.ok || !result.received) {
      status.textContent = result.error ?? 'Your message could not be sent. Please try again.';
      return;
    }
    form.reset();
    status.textContent = 'Thanks for reaching out. We received your message.';
    status.focus();
  } catch {
    status.textContent = 'Your message could not be sent. Please try again.';
  } finally {
    button.disabled = false;
  }
});
