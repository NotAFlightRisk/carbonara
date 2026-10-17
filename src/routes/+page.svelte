<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import HeatPanel from '#lib/components/HeatPanel.svelte';
  import MapPanel from '#lib/components/MapPanel.svelte';
  import Masthead from '#lib/components/Masthead.svelte';
  import MixPanel from '#lib/components/MixPanel.svelte';
  import NowPanel from '#lib/components/NowPanel.svelte';
  import PlanPanel from '#lib/components/PlanPanel.svelte';
  import StreamPanel from '#lib/components/StreamPanel.svelte';
  import YearsPanel from '#lib/components/YearsPanel.svelte';
  import { Live } from '#lib/live.svelte.js';
  import { description, imageAlt, name, site, source, structuredData, title } from '#lib/meta.js';
  import { REGIONS, latest, placeName, trackFor } from '#lib/story.js';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const SAVED = 'carbonara:region';
  const live = new Live(untrack(() => data.snapshot));
  let region = $state(untrack(() => (REGIONS[data.region] ? data.region : 0)));
  let ready = $state(false);

  const snapshot = $derived(live.snapshot);
  const now = $derived(snapshot?.now ?? 0);
  const track = $derived(snapshot ? trackFor(snapshot, region) : null);
  const intensity = $derived(track ? (latest(track, now)?.value ?? null) : null);
  const mix = $derived(
    region
      ? (snapshot?.regions?.mix[region] ?? null)
      : (snapshot?.mix?.values.findLast(Boolean) ?? null)
  );

  function pick(id: number) {
    region = id;
    try {
      localStorage.setItem(SAVED, String(id));
    } catch {
      // private browsing, so it's just this visit
    }
    const url = new URL(location.href);
    if (id) url.searchParams.set('region', String(id));
    else url.searchParams.delete('region');
    if (ready) replaceState(url, {});
  }

  onMount(() => {
    ready = true;
    if (!data.region) {
      try {
        const saved = Number(localStorage.getItem(SAVED));
        if (REGIONS[saved]) region = saved;
      } catch {
        // nothing saved we can read
      }
    }
    return live.start();
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="max-image-preview:large" />
  <link rel="canonical" href={site} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={name} />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={site} />
  <meta property="og:image" content="{site}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image:alt" content={imageAlt} />
  {@html `<script type="application/ld+json">${structuredData}</script>`}
</svelte:head>

<Masthead {region} fetched={snapshot?.fetched ?? null} failing={live.failing} onpick={pick} />

<main>
  <div class="intro">
    <h1>How clean Britain's electricity is, right now</h1>
    <p>
      Grams of CO₂ for every unit of power, what's making it, and when it'll be cleaner. Times are
      UK time, and it all refreshes by itself.
    </p>
  </div>

  <div class="board">
    <NowPanel {track} gb={snapshot?.gb ?? null} history={data.history} {region} {now} />
    <MixPanel {mix} {intensity} factors={data.history?.factors ?? null} place={placeName(region)} />
    <PlanPanel {track} {region} {now} />
    <MapPanel regions={snapshot?.regions ?? null} {now} {region} onpick={pick} />
    <StreamPanel mix={snapshot?.mix ?? null} />
    <HeatPanel track={snapshot?.gb ?? null} {now} />
    <YearsPanel history={data.history} />
  </div>
</main>

<footer>
  <p>
    Data from the <a href="https://carbonintensity.org.uk/">Carbon Intensity API</a> by NESO, under
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Region shapes from
    <a href="https://www.neso.energy/data-portal/gis-boundaries-gb-dno-license-areas"
      >NESO's open data</a
    >. Forecasts are forecasts, the weather gets a vote.
  </p>
  <p><a href={source}>Source on GitHub</a></p>
</footer>

<style>
  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-5) 0;
  }

  .intro {
    display: grid;
    gap: var(--space-2);
    max-width: 62ch;
    padding: var(--space-3) 0 var(--space-5);

    h1 {
      font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.5rem);
      font-weight: 750;
      font-stretch: var(--narrow);
      line-height: 1.05;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }

    p {
      color: var(--ink-soft);
    }
  }

  .board {
    display: grid;
    gap: var(--hairline);
    border: var(--hairline) solid var(--rule);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--rule);
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-areas:
      'now now now now now mix mix mix mix mix mix mix'
      'plan plan plan plan plan plan plan plan plan plan plan plan'
      'map map map map map stream stream stream stream stream stream stream'
      'map map map map map heat heat heat heat heat heat heat'
      'years years years years years years years years years years years years';

    > :global(.now) {
      grid-area: now;
    }

    > :global(.mix) {
      grid-area: mix;
    }

    > :global(.plan) {
      grid-area: plan;
    }

    > :global(.map) {
      grid-area: map;
    }

    > :global(.stream) {
      grid-area: stream;
    }

    > :global(.heat) {
      grid-area: heat;
    }

    > :global(.years) {
      grid-area: years;
    }
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-3) var(--space-6);
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-5) var(--space-7);
    color: var(--ink-soft);
    font-size: 0.85rem;

    p {
      max-width: 75ch;
    }
  }

  @media (max-width: 1099px) {
    .board {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas:
        'now mix'
        'plan plan'
        'map stream'
        'map heat'
        'years years';
    }
  }

  @media (max-width: 760px) {
    main {
      padding: var(--space-4) var(--space-3) 0;
    }

    .board {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'now' 'mix' 'plan' 'map' 'stream' 'heat' 'years';
    }

    footer {
      padding-inline: var(--space-4);
    }
  }
</style>
