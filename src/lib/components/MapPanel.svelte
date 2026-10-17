<script lang="ts">
  import { flip } from 'svelte/animate';
  import { MediaQuery } from 'svelte/reactivity';
  import { SCALE_MAX, bandOf, colourOf } from '#lib/bands.js';
  import shapes from '#lib/data/regions.json';
  import { REGIONS, indexAt } from '#lib/story.js';
  import { HALF_HOUR, clock, day, when } from '#lib/time.js';
  import type { Snapshot } from '#lib/types.js';
  import BandKey from './BandKey.svelte';
  import Plate from './Plate.svelte';
  import Switch from './Switch.svelte';
  import Tip from './Tip.svelte';

  interface Props {
    regions: Snapshot['regions'];
    now: number;
    region: number;
    onpick: (region: number) => void;
  }

  let { regions, now, region, onpick }: Props = $props();

  const inset = shapes.shetland;
  const calm = new MediaQuery('prefers-reduced-motion: reduce');
  const STEP_MS = 140;

  let view = $state<'map' | 'rank'>('map');
  let offset = $state(0);
  let playing = $state(false);
  let hovered = $state<number | null>(null);

  const current = $derived(regions ? indexAt(regions, now) : 0);
  const span = $derived(regions ? Object.values(regions.values)[0].length - 1 - current : 0);
  const at = $derived(current + offset);
  const time = $derived(regions ? regions.start + at * HALF_HOUR : now);

  const readings = $derived(
    regions
      ? Object.keys(REGIONS)
          .map(Number)
          .map((id) => ({ id, name: REGIONS[id], value: regions.values[id]?.[at] ?? null }))
      : []
  );
  const ranked = $derived(
    readings
      .filter((reading): reading is typeof reading & { value: number } => reading.value != null)
      .toSorted((a, b) => a.value - b.value)
  );

  const title = $derived.by(() => {
    if (ranked.length < 2) return 'Across the country';
    const [cleanest, dirtiest] = [ranked[0], ranked.at(-1)!];
    return `Cleanest in ${cleanest.name}, dirtiest in ${dirtiest.name}`;
  });

  // the selected region draws last, so its outline sits on top of its neighbours
  const drawn = $derived(
    shapes.regions.toSorted((a, b) => Number(a.id === region) - Number(b.id === region))
  );

  $effect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (offset >= span) playing = false;
      else offset += 1;
    }, STEP_MS);
    return () => clearInterval(timer);
  });

  function play() {
    if (offset >= span) offset = 0;
    playing = !playing;
  }

  const readingOf = (id: number) => readings.find((reading) => reading.id === id)?.value ?? null;
  const hoveredValue = $derived(hovered ? readingOf(hovered) : null);

  // the middle of each region's box, for pinning its tooltip
  const centres = new Map(
    shapes.regions.map(({ id, d }) => {
      const points = d.match(/\d+,\d+/g)!.map((pair) => pair.split(',').map(Number));
      const [xs, ys] = [points.map(([x]) => x), points.map(([, y]) => y)];
      return [
        id,
        [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
      ];
    })
  );
</script>

<Plate
  id="map"
  {title}
  note={offset ? `Forecast for ${when(time, now)}` : 'Forecast for this half hour, by region'}
  missing={!regions}
>
  {#snippet tools()}
    <Switch
      label="Show as"
      options={[
        { value: 'map', label: 'Map' },
        { value: 'rank', label: 'Ranking' }
      ]}
      bind:value={view}
    />
  {/snippet}

  {#if regions}
    <div class="scrub">
      <button
        type="button"
        class="play"
        onclick={play}
        aria-label={playing ? 'Pause' : 'Play the next 48 hours'}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {#if playing}
            <path d="M4 3h3v10H4zM9 3h3v10H9z" />
          {:else}
            <path d="M4 2.5v11l9-5.5z" />
          {/if}
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max={span}
        bind:value={offset}
        aria-label="Time"
        aria-valuetext="{day(time)} {clock(time)}"
        oninput={() => (playing = false)}
      />
      <output class="when">{offset ? `${day(time)} ${clock(time)}` : 'Now'}</output>
    </div>

    {#if view === 'map'}
      <div class="map">
        <svg
          viewBox="0 0 {shapes.width} {shapes.height}"
          role="group"
          aria-label="Map of Great Britain by region"
        >
          <rect
            class="inset"
            x={inset[0] - 8}
            y={inset[1] - 6}
            width={inset[2] + 16}
            height={inset[3] + 12}
            rx="4"
          />
          <g class="underlay" aria-hidden="true">
            {#each shapes.regions as shape (shape.id)}<path d={shape.d} />{/each}
          </g>
          {#each drawn as shape (shape.id)}
            {@const value = readingOf(shape.id)}
            <path
              d={shape.d}
              class="region"
              class:mine={shape.id === region}
              class:aside={region !== 0 && shape.id !== region && hovered !== shape.id}
              class:calm={calm.current}
              style:fill={value != null ? colourOf(value) : 'var(--plate-sunk)'}
              role="button"
              tabindex="0"
              aria-label="{REGIONS[shape.id]}: {value != null
                ? `${Math.round(value)} grams, ${bandOf(value).name}`
                : 'no forecast'}. Pick as your area."
              aria-pressed={shape.id === region}
              onpointerenter={() => (hovered = shape.id)}
              onpointerleave={() => (hovered = null)}
              onfocus={() => (hovered = shape.id)}
              onblur={() => (hovered = null)}
              onclick={() => onpick(shape.id === region ? 0 : shape.id)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onpick(shape.id === region ? 0 : shape.id);
                }
              }}
            />
          {/each}
        </svg>
        {#if hovered}
          {@const [cx, cy] = centres.get(hovered)!}
          <Tip x={cx / shapes.width} y={cy / shapes.height}>
            <strong>{REGIONS[hovered]}</strong><br />
            {#if hoveredValue != null}
              {Math.round(hoveredValue)} g · {bandOf(hoveredValue).name}
            {:else}
              No forecast
            {/if}
            <br /><span class="soft"
              >{hovered === region ? 'Your area, tap to clear' : 'Tap to make it yours'}</span
            >
          </Tip>
        {/if}
      </div>
    {:else}
      <ol class="rank">
        {#each ranked as reading (reading.id)}
          <li
            class:mine={reading.id === region}
            animate:flip={{ duration: calm.current ? 0 : 300 }}
          >
            <button type="button" onclick={() => onpick(reading.id === region ? 0 : reading.id)}>
              <span class="name">{reading.name}</span>
              <span class="scale" aria-hidden="true">
                <span
                  class="dot"
                  style:left="{(Math.min(reading.value, SCALE_MAX) / SCALE_MAX) * 100}%"
                  style:background={colourOf(reading.value)}
                ></span>
              </span>
              <span class="value">{Math.round(reading.value)} g</span>
            </button>
          </li>
        {/each}
      </ol>
    {/if}
    <BandKey />
  {/if}
</Plate>

<style>
  .scrub {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
  }

  .play {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    padding: 0;
    border: var(--hairline) solid var(--rule);
    border-radius: 50%;
    background: var(--plate-sunk);
    cursor: pointer;

    svg {
      width: 16px;
      fill: var(--ink);
    }

    &:hover {
      border-color: var(--plan);
    }
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--plan);
  }

  .when {
    min-width: 6.5rem;
    font-weight: 650;
    font-stretch: var(--narrow);
    text-align: right;
  }

  .map {
    position: relative;

    svg {
      display: block;
      width: 100%;
      max-height: 78vh;
    }
  }

  .inset {
    fill: none;
    stroke: var(--rule);
    stroke-dasharray: 3 3;
  }

  .underlay {
    fill: var(--plate);
  }

  .region {
    stroke: var(--plate);
    stroke-width: 1.5;
    stroke-linejoin: round;
    cursor: pointer;
    transition:
      fill 260ms linear,
      opacity var(--quick) var(--ease-out);

    &.calm {
      transition: none;
    }

    &:hover,
    &:focus-visible {
      stroke: var(--ink);
      outline: none;
    }

    &.mine {
      stroke: var(--plan);
      stroke-width: 3.5;
    }

    &.aside {
      opacity: 0.5;
    }
  }

  .rank {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;

    button {
      display: grid;
      grid-template-columns: minmax(8rem, 12rem) 1fr 3.5rem;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 36px;
      padding: 0 var(--space-2);
      border: 0;
      border-radius: var(--radius);
      background: none;
      text-align: left;
      cursor: pointer;

      &:hover {
        background: var(--plate-sunk);
      }
    }

    .mine button {
      box-shadow: inset 0 0 0 2px var(--plan);
    }
  }

  .name {
    font-stretch: var(--narrow);
  }

  .scale {
    position: relative;
    height: 2px;
    background: var(--grid);
  }

  .dot {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    border: 2px solid var(--plate);
    border-radius: 50%;
    translate: -50% -50%;
  }

  .value {
    font-weight: 650;
    text-align: right;
  }

  .soft {
    color: var(--ink-soft);
  }

  @media (max-width: 520px) {
    .rank button {
      grid-template-columns: minmax(6rem, 9rem) 1fr 3.2rem;
    }
  }
</style>
