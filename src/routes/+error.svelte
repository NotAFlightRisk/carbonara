<script lang="ts">
  import { page } from '$app/state';

  const lost = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{lost ? 'Off the scale' : 'Something went wrong'} · carbonara</title>
</svelte:head>

<main class="lost">
  <p class="reading">{page.status}</p>
  <h1>{lost ? 'That page is off the scale' : 'Something went wrong'}</h1>
  <p>{lost ? "There's nothing here, the needle's just spinning." : page.error?.message}</p>
  <a href="/">Back to the grid</a>
</main>

<style>
  .lost {
    display: grid;
    place-content: center;
    justify-items: start;
    gap: var(--space-3);
    min-height: 100dvh;
    padding: var(--space-5);
  }

  .reading {
    font-size: 4rem;
    font-weight: 800;
    font-stretch: var(--narrow);
    line-height: 1;
    color: var(--plan);
  }

  h1 {
    font-size: 1.6rem;
  }

  p {
    color: var(--ink-soft);
  }

  a {
    font-weight: 650;
  }
</style>
