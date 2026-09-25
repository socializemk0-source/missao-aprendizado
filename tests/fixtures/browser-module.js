import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

export async function loadClient({ configured = true, session = null, profileStatus = 200, initial = {}, signup = {}, authOverrides = {} } = {}) {
  const values = new Map(Object.entries(initial));
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
  const calls = [];
  let listener;
  const auth = {
    getSession: async () => ({ data: { session } }),
    signUp: async () => ({ data: signup, error: null }),
    signInWithPassword: async () => ({ data: { user: { id:'A', email:'a@example.com' }, session: { user:{ id:'A', email:'a@example.com' }, access_token:'test' } }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: cb => { listener = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return { error:null }; },
    resend: async (...args) => { calls.push(['resend', ...args]); return { error:null }; },
    updateUser: async (...args) => { calls.push(['update', ...args]); return { error:null }; },
    ...authOverrides,
  };
  const fetch = async (url, options) => {
    calls.push([url, options]);
    if (url === '/api/config/supabase') return { ok:configured, json:async()=>({ supabaseUrl:'https://test.supabase.co', supabaseAnonKey:'public-test' }) };
    return { ok:profileStatus === 200, status:profileStatus, json:async()=>profileStatus === 200 ? { success:true, profile: { uid:session?.user.id || 'A', name:'Aluno A', plan:'pro' } } : { error:'Perfil indisponível' } };
  };
  const window = new EventTarget();
  Object.assign(window, { fetch, location:{ origin:'http://localhost:3000', pathname:'/entrar', search:'', hash:'', href:'', reload(){ calls.push(['reload']); } }, history:{ replaceState() {} } });
  const context = vm.createContext({ window, localStorage:storage, sessionStorage:storage, fetch, console, URL, URLSearchParams, Headers, CustomEvent, Event, setTimeout, clearTimeout, queueMicrotask, AbortSignal });
  const modules = new Map();
  async function load(url) {
    if (modules.has(url)) return modules.get(url);
    const source = await readFile(new URL(url), 'utf8');
    const module = new vm.SourceTextModule(source, { context, identifier:url });
    modules.set(url,module);
    await module.link(async (specifier, parent) => {
      if (specifier.startsWith('https://esm.sh/')) {
        return new vm.SyntheticModule(['createClient'], function() {
          this.setExport('createClient', (url,key) => { if (!url || !key) throw new Error('supabaseUrl is required'); return {auth}; });
        }, {context});
      }
      return load(new URL(specifier, parent.identifier).href);
    });
    return module;
  }
  const module = await load(new URL('../../public/supabase-client.js', import.meta.url).href);
  await module.evaluate();
  await module.namespace.sessionReady;
  return { api:module.namespace, values, window, calls, listener:()=>listener, auth };
}
