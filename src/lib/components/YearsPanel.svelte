<script lang="ts">
  import { bandOf, colourOf } from '#lib/bands.js';
  import { DAY, dayMonth } from '#lib/time.js';
  import type { History } from '#lib/types.js';
  import Plate from './Plate.svelte';
  import Switch from './Switch.svelte';
  import Tip from './Tip.svelte';

  interface Props {
    history: History | null;
  }

  let { history }: Props = $props();

  let view = $state<'stripes' | 'range'>('stripes');
  let hovered = $state<number | null>(null);

  const years = $derived(history?.years ?? []);
  const [first, last] = $derived([years[0], years.at(-1)]);
  const change = $derived(first && last ? Math.round((1 - last.average / first.average) * 100) : 0);
  const title = $derived(
    first && last && years.length > 1
      ? change >= 0
        ? `Down ${change}% since ${first.year}`
        : `Up ${-change}% on ${first.year}`
      : 'Year on year'
  );
  const note = $derived(
    history
      ? `Average for ${dayMonth(history.from)} to ${dayMonth(history.to - DAY)}, every year the API goes back`
      : undefined
  );

  const top = $derived(Math.ceil(Math.max(...years.map((year) => year.max), 100) / 50) * 50);
  const H = 220;
  const pad = { top: 16, bottom: 26 };
  const y = (value: number) => pad.top + (1 - value / top) * (H - pad.top - pad.bottom);
  const x = (i: number) => ((i + 0.5) / years.length) * 100;
  const gridlines = $derived([100, 200, 300, 400].filter((value) => value < top));
  const picked = $derived(hovered != null ? years[hovered] : null);
</script>

<Plate id="years" {title} {note} missing={years.length < 2}>
  {#snippet tools()}
    <Switch
      label="Show as"
      options={[
        { value: 'stripes', label: 'Stripes' },
        { value: 'range', label: 'Range' }
      ]}
      bind:value={view}
    />
  {/snippet}

  <div class="years" onpointerleave={() => (hovered = null)} role="presentation">
    {#if view === 'stripes'}
      <ol class="stripes">
        {#each years as year, i (year.year)}
          <li>
            <button
              type="button"
              style:background={colourOf(year.average)}
              aria-label="{year.year}: averaged {year.average} grams, {bandOf(year.average).name}"
              onpointerenter={() => (hovered = i)}
              onfocus={() => (hovered = i)}
              onblur={() => (hovered = null)}
            ></button>
            <span class="year">{String(year.year).slice(2)}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <svg
        class="range"
        viewBox="0 0 100 {H}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Lowest, average and highest for each year"
      >
        {#each gridlines as value (value)}
          <line
            class="grid"
            x1="0"
            x2="100"
            y1={y(value)}
            y2={y(value)}
            vector-effect="non-scaling-stroke"
          />
        {/each}
        {#each years as year, i (year.year)}
          <line
            class="span"
            x1={x(i)}
            x2={x(i)}
            y1={y(year.max)}
            y2={y(year.min)}
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </svg>
      <div class="dots" style:height="{H}px">
        {#each gridlines as value (value)}
          <span class="scale" style:top="{(y(value) / H) * 100}%">{value} g</span>
        {/each}
        {#each years as year, i (year.year)}
          <button
            type="button"
            class="dot"
            style:left="{x(i)}%"
            style:top="{(y(year.average) / H) * 100}%"
            style:background={colourOf(year.average)}
            aria-label="{year.year}: {year.min} to {year.max} grams, averaging {year.average}"
            onpointerenter={() => (hovered = i)}
            onfocus={() => (hovered = i)}
            onblur={() => (hovered = null)}
          ></button>
          <span class="year" style:left="{x(i)}%">{String(year.year).slice(2)}</span>
        {/each}
      </div>
    {/if}
    {#if picked && hovered != null}
      <Tip x={x(hovered) / 100} y={0.35}>
        <strong>{picked.year}</strong><br />
        averaged {picked.average} g<br />
        <span class="soft">{picked.min} to {picked.max} g</span>
      </Tip>
    {/if}
  </div>
</Plate>

<style>
  .years {
    position: relative;
  }

  .stripes {
    display: flex;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      flex: 1;
      display: grid;
      gap: var(--space-1);
    }

    button {
      height: 160px;
      padding: 0;
      border: 0;
      border-radius: 2px;
      cursor: default;
      transition: transform var(--quick) var(--ease-out);

      &:hover,
      &:focus-visible {
        transform: scaleY(1.04);
      }
    }
  }

  .year {
    color: var(--ink-soft);
    font-size: 0.75rem;
    text-align: center;
  }

  .range {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
    height: 220px;
  }

  .grid {
    stroke: var(--grid);
  }

  .span {
    stroke: var(--ink-faint);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .dots {
    position: relative;

    .dot {
      position: absolute;
      width: 16px;
      height: 16px;
      padding: 0;
      border: 2px solid var(--plate);
      border-radius: 50%;
      translate: -50% -50%;
      cursor: default;
    }

    .year {
      position: absolute;
      bottom: 0;
      translate: -50% 0;
    }

    .scale {
      position: absolute;
      left: 0;
      translate: 0 -120%;
      color: var(--ink-soft);
      font-size: 0.7rem;
    }
  }

  .soft {
    color: var(--ink-soft);
  }
</style>
