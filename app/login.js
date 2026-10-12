import { TOKENS } from './style.js';
const PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || '';
// Clerk's frontend API host, e.g. https://clerk.example.com (shown in the Clerk dashboard).
const FRONTEND_API = process.env.CLERK_FRONTEND_API || '';
const TRUSTED = JSON.stringify((process.env.VAULT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean));

export function loginPage({ denied = false } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#0b0b0b">
  <title>Vault · Sign in</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/fonts/geist.css">
<script>(function(){var c=(document.cookie.match(/(?:^|; )theme=(light|dark)/)||[])[1];if(!c){try{c=localStorage.getItem('theme')}catch(e){}}if(c==='light'){document.documentElement.dataset.mode='light';document.querySelector('meta[name=theme-color]').content='#ebebeb'}})();</script>
  <style>${TOKENS}
    html, body { min-height: 100%; background: var(--panel); }
    main { min-height: 100svh; display: flex; flex-direction: column; align-items: center; padding: 20px 16px max(20px, env(safe-area-inset-bottom)); }
    header, footer { width: min(100%, 400px); display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--text-3); }
    header .brand { display: flex; align-items: center; gap: 9px; color: var(--text); font-weight: 500; font-size: 14px; }
    header .brand img { width: 22px; height: 22px; border-radius: 6px; }
    footer { margin-top: auto; padding-top: 48px; }
    footer a:hover { color: var(--text); }
    .panel { width: min(100%, 400px); margin-top: 14vh; padding: 28px 24px 22px; background: var(--surface); border-radius: 18px; box-shadow: var(--shadow-lg); }
    .eyebrow { font-size: 12.5px; color: var(--text-3); margin-bottom: 8px; }
    h1 { margin: 0; font-size: 22px; line-height: 28px; font-weight: 500; letter-spacing: -0.022em; }
    .intro { margin-top: 8px; color: var(--text-2); line-height: 1.5; }
    #signin, #denied { margin-top: 24px; }
    button, input { font: inherit; color: inherit; letter-spacing: inherit; }
    button { cursor: pointer; } button:disabled { opacity: .45; cursor: wait; }
    .google, .secondary { width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 999px; border: 0; background: var(--hover-2); color: var(--text); font-weight: 500; transition: background .15s; }
    .google:hover, .secondary:hover { background: var(--hover-2); }
    .g { width: 18px; height: 18px; }
    .arrow { display: none; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0 16px; font-size: 12.5px; color: var(--text-3); }
    .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field label { font-size: 13px; color: var(--text-2); }
    .field input { height: 44px; padding: 0 14px; border-radius: 12px; border: 0; background: var(--hover-2); outline: 0; font-size: 16px; }
    .field input:focus { box-shadow: inset 0 0 0 1px var(--text-3); }
    .field input::placeholder { color: var(--text-3); }
    .submit { height: 44px; border: 0; border-radius: 999px; background: var(--btn); color: var(--btn-text); font-weight: 500; transition: opacity .15s; }
    .submit:hover { opacity: .88; }
    .code { font-variant-numeric: tabular-nums; letter-spacing: .3em; }
    .message { min-height: 18px; margin: 12px 2px 0; font-size: 13px; color: var(--text-3); }
    .message.error { color: var(--accent); }
    .hidden { display: none !important; }
    .denied { padding: 12px 14px; margin-bottom: 12px; border-radius: 12px; background: var(--hover); color: var(--text-2); line-height: 1.45; }
  </style>
</head>
<body>
<main>
  <header><div class="brand">Vault</div><span>Private</span></header>
  <section class="panel">
    <p class="eyebrow">Private access</p>
    <h1>${denied ? 'This account isn’t on the list.' : 'Sign in to your vault.'}</h1>
    <p class="intro">${denied ? 'Use the address this work was shared with, or add this account to VAULT_ALLOWED_EMAILS.' : 'Selected work, notes, and process—shared intentionally.'}</p>
    <div id="denied" class="${denied ? '' : 'hidden'}"><div class="method"><div class="denied">You’re signed in, but this email doesn’t have access.</div><button id="switch" class="secondary">Use another account <span class="arrow">→</span></button></div></div>
    <div id="signin" class="${denied ? 'hidden' : ''}">
      <div class="method"><button id="google" class="google"><svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z"/></svg><span>Continue with Google</span><span class="arrow">→</span></button></div>
      <div class="divider">or with email</div>
      <form id="email-form" class="field"><label for="email">Email</label><input id="email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required><button id="send" type="submit" class="submit">Send code</button></form>
      <form id="code-form" class="field hidden"><label for="code">Verification code</label><input id="code" name="code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" required><button id="verify" type="submit" class="submit">Continue</button></form>
      <p id="message" class="message" aria-live="polite"></p><div id="clerk-captcha"></div>
    </div>
  </section>
  <footer><span>Private</span></footer>
</main>
<script defer crossorigin="anonymous" data-clerk-publishable-key="${PUBLISHABLE_KEY}" src="${FRONTEND_API}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>
<script>
window.addEventListener('load',async()=>{
  const qs=new URLSearchParams(location.search);const raw=qs.get('return_to')||'/';const parsed=new URL(raw,location.origin);const trusted=${TRUSTED};const returnTo=trusted.includes(parsed.origin)?parsed.href:'/in';const denied=${denied ? 'true' : 'false'};const preview=qs.get('preview')==='1';
  const message=document.getElementById('message');const errorText=e=>e?.errors?.[0]?.longMessage||e?.errors?.[0]?.message||e?.message||'Something went wrong. Please try again.';const busy=on=>document.querySelectorAll('button').forEach(b=>b.disabled=on);
  try{
    await Clerk.load();
    if(location.pathname==='/sso-callback'){await Clerk.handleRedirectCallback({signInFallbackRedirectUrl:returnTo,signUpFallbackRedirectUrl:returnTo});location.replace(returnTo);return}
    if(preview){document.querySelectorAll('form,button').forEach(el=>el.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation()},{capture:true}));document.querySelectorAll('form').forEach(el=>el.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation()},{capture:true}));return}
    if(Clerk.isSignedIn&&!denied){if(new URL(returnTo,location.origin).origin===location.origin)location.replace(returnTo);else await Clerk.redirectWithAuth(returnTo);return}
    document.getElementById('switch')?.addEventListener('click',async()=>{busy(true);await Clerk.signOut();location.replace('/login?return_to='+encodeURIComponent(returnTo))});
    document.getElementById('google')?.addEventListener('click',async()=>{busy(true);message.textContent='Opening Google…';try{await Clerk.client.signIn.authenticateWithRedirect({strategy:'oauth_google',redirectUrl:'/sso-callback?return_to='+encodeURIComponent(returnTo),redirectUrlComplete:returnTo})}catch(e){busy(false);message.className='message error';message.textContent=errorText(e)}});
    let flow='signin';
    document.getElementById('email-form')?.addEventListener('submit',async event=>{event.preventDefault();busy(true);message.className='message';message.textContent='Sending your code…';const email=document.getElementById('email').value.trim().toLowerCase();try{try{const attempt=await Clerk.client.signIn.create({identifier:email});const factor=attempt.supportedFirstFactors?.find(item=>item.strategy==='email_code');if(!factor)throw new Error('Email code is not available for this account.');await Clerk.client.signIn.prepareFirstFactor({strategy:'email_code',emailAddressId:factor.emailAddressId});flow='signin'}catch(e){if(e?.errors?.[0]?.code!=='form_identifier_not_found')throw e;await Clerk.client.signUp.create({emailAddress:email});await Clerk.client.signUp.prepareEmailAddressVerification({strategy:'email_code'});flow='signup'}document.getElementById('email-form').classList.add('hidden');document.getElementById('code-form').classList.remove('hidden');document.getElementById('code').focus();message.textContent='Code sent. It expires in 10 minutes.';busy(false)}catch(e){busy(false);message.className='message error';message.textContent=errorText(e)}});
    document.getElementById('code-form')?.addEventListener('submit',async event=>{event.preventDefault();busy(true);message.className='message';message.textContent='Checking the code…';try{const code=document.getElementById('code').value.trim();const attempt=flow==='signin'?await Clerk.client.signIn.attemptFirstFactor({strategy:'email_code',code}):await Clerk.client.signUp.attemptEmailAddressVerification({code});if(attempt.status!=='complete'||!attempt.createdSessionId)throw new Error('More verification is required.');await Clerk.setActive({session:attempt.createdSessionId,navigate:async({session,decorateUrl})=>{if(session?.currentTask)throw new Error('More verification is required.');window.location.href=decorateUrl(returnTo)}})}catch(e){busy(false);message.className='message error';message.textContent=errorText(e)}});
  }catch(e){if(message){message.className='message error';message.textContent=errorText(e)}}
});
</script>
</body></html>`;
}
