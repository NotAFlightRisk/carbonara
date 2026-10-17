<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPlausible } from '#lib/plausible.js';
  import '../app.css';

  let { children } = $props();

  onMount(() => loadPlausible());
</script>

{@render children()}
