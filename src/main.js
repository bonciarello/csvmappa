import { mount } from 'svelte';
import App from './App.svelte';

// Svelte 5: i componenti si montano con mount(), non con `new App()` (idioma
// Svelte 4) — il vecchio costruttore salta init_operations e crasha al primo
// accesso al DOM ("Cannot read properties of undefined (reading 'call')").
const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
